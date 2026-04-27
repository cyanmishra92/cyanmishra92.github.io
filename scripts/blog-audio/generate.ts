/**
 * Build-time TTS generator. For every published blog post:
 *   1. Read the .mdx source.
 *   2. Run the preprocessor → narration prose.
 *   3. Hash (script + voice + model + preprocessor version).
 *   4. If src/data/blog-audio.json already has that hash for the slug,
 *      skip — idempotent.
 *   5. Otherwise: chunk at sentence boundaries (≤4000 chars), call
 *      OpenAI tts-1-hd per chunk, concatenate the MP3 buffers, parse
 *      duration via music-metadata, upload to R2 with content-hash
 *      filename, write the JSON entry.
 *
 * Designed to NEVER crash the build. Missing secrets, API errors,
 * upload failures all degrade gracefully — the post just deploys
 * without an audio player.
 *
 * Env (all optional unless noted):
 *   OPENAI_API_KEY              required for any generation to happen
 *   R2_ACCOUNT_ID               required for upload
 *   R2_ACCESS_KEY_ID            required for upload
 *   R2_SECRET_ACCESS_KEY        required for upload
 *   R2_BUCKET                   required for upload
 *   R2_PUBLIC_URL               required to populate the public URL
 *   ONLY_SLUG                   process only this slug (workflow_dispatch)
 *   FORCE_REGEN                 'true' to ignore the hash cache
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import matter from 'gray-matter';
import { parseBuffer as parseAudioBuffer } from 'music-metadata';
import OpenAI from 'openai';
import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { preprocessForTTS, PREPROCESSOR_VERSION } from './preprocess';

const ROOT = process.cwd();
const BLOG_DIR = path.join(ROOT, 'src', 'content', 'blog');
const DATA_FILE = path.join(ROOT, 'src', 'data', 'blog-audio.json');
// Audio MP3s are committed into the repo at public/audio/<hash>.mp3 so
// they ship to /audio/<hash>.mp3 on the deployed site. Same-origin
// playback is the only thing that survives every corporate firewall;
// R2 stays as a best-effort mirror for podcast clients + manual fallback.
const PUBLIC_AUDIO_DIR = path.join(ROOT, 'public', 'audio');
const PUBLIC_AUDIO_URL_PREFIX = '/audio';
const MODEL = 'tts-1-hd';
const DEFAULT_VOICE = 'echo';
const CHUNK_MAX_CHARS = 4000;
const COST_PER_MILLION_CHARS = 30; // USD, OpenAI tts-1-hd as of Apr 2026

type Voice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';

interface AudioEntry {
  /** Same-origin path served from public/audio/. The player tries this first. */
  url: string;
  /** Optional R2 absolute URL — used as a fallback when the same-origin
   *  load fails (rare; e.g., user is offline mid-deploy or local quirks). */
  mirror?: string;
  duration: number;
  voice: Voice;
  model: string;
  preprocessorVersion: number;
  scriptHash: string;
  scriptLength: number;
  bytes: number;
  generatedAt: string;
}

interface AudioCache {
  [slug: string]: AudioEntry;
}

interface Result {
  slug: string;
  status: 'generated' | 'cached' | 'skipped' | 'error';
  cost?: number;
  error?: string;
}

function readCache(): AudioCache {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw) as AudioCache;
  } catch {
    return {};
  }
}

function writeCache(cache: AudioCache) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  // Sort keys for stable diffs.
  const sorted: AudioCache = {};
  for (const k of Object.keys(cache).sort()) sorted[k] = cache[k];
  fs.writeFileSync(DATA_FILE, JSON.stringify(sorted, null, 2) + '\n');
}

function shaHex(s: string): string {
  return crypto.createHash('sha256').update(s).digest('hex');
}

/**
 * Greedy sentence-boundary chunker. Sentences are split on
 * punctuation followed by whitespace + uppercase. If a single
 * sentence is longer than the cap, force-split at the nearest comma,
 * then at hard char boundaries with a warning.
 */
function chunkScript(script: string, maxChars = CHUNK_MAX_CHARS): string[] {
  const sentences = script
    .split(/(?<=[.!?])\s+(?=[A-Z]|$)/g)
    .map((s) => s.trim())
    .filter(Boolean);
  const chunks: string[] = [];
  let current = '';
  for (const s of sentences) {
    if (s.length > maxChars) {
      // Flush current first.
      if (current) {
        chunks.push(current);
        current = '';
      }
      // Try to split this oversized sentence at commas.
      const parts = s.split(/(?<=,)\s+/g);
      let buf = '';
      for (const p of parts) {
        if ((buf + ' ' + p).length > maxChars) {
          if (buf) chunks.push(buf);
          if (p.length > maxChars) {
            // Last resort — hard split.
            console.warn(`[audio] sentence exceeds ${maxChars} chars even after comma split; hard-splitting.`);
            for (let i = 0; i < p.length; i += maxChars) chunks.push(p.slice(i, i + maxChars));
            buf = '';
          } else {
            buf = p;
          }
        } else {
          buf = buf ? `${buf} ${p}` : p;
        }
      }
      if (buf) chunks.push(buf);
      continue;
    }
    if ((current + ' ' + s).length > maxChars) {
      if (current) chunks.push(current);
      current = s;
    } else {
      current = current ? `${current} ${s}` : s;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

async function callTTS(openai: OpenAI, text: string, voice: Voice): Promise<Buffer> {
  const res = await openai.audio.speech.create({
    model: MODEL,
    voice,
    input: text,
    response_format: 'mp3',
    speed: 1.0,
  });
  return Buffer.from(await res.arrayBuffer());
}

async function durationFromMp3(buf: Buffer): Promise<number> {
  try {
    const meta = await parseAudioBuffer(buf, { mimeType: 'audio/mpeg' });
    if (meta.format.duration && Number.isFinite(meta.format.duration)) {
      return Math.round(meta.format.duration);
    }
  } catch {
    // fall through
  }
  // Fallback estimate: ~15 chars/sec for English speech at 1×.
  return 0;
}

function estimateCost(scriptLength: number): number {
  return (scriptLength / 1_000_000) * COST_PER_MILLION_CHARS;
}

function makeS3(): S3Client | null {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) return null;
  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

async function uploadToR2(s3: S3Client, key: string, body: Buffer): Promise<void> {
  const bucket = process.env.R2_BUCKET;
  if (!bucket) throw new Error('R2_BUCKET not set');
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: 'audio/mpeg',
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  );
}

function pruneLocal(cache: AudioCache): number {
  if (!fs.existsSync(PUBLIC_AUDIO_DIR)) return 0;
  const keep = new Set(Object.values(cache).map((e) => `${e.scriptHash}.mp3`));
  let removed = 0;
  for (const name of fs.readdirSync(PUBLIC_AUDIO_DIR)) {
    if (!name.endsWith('.mp3')) continue;
    if (keep.has(name)) continue;
    fs.unlinkSync(path.join(PUBLIC_AUDIO_DIR, name));
    removed += 1;
  }
  return removed;
}

async function pruneOrphans(s3: S3Client, cache: AudioCache): Promise<number> {
  const bucket = process.env.R2_BUCKET;
  if (!bucket) return 0;
  const keep = new Set(
    Object.values(cache).map((e) => `audio/${e.scriptHash}.mp3`),
  );
  let removed = 0;
  let token: string | undefined;
  do {
    const out = await s3.send(
      new ListObjectsV2Command({ Bucket: bucket, Prefix: 'audio/', ContinuationToken: token }),
    );
    for (const obj of out.Contents ?? []) {
      if (!obj.Key) continue;
      if (keep.has(obj.Key)) continue;
      await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: obj.Key }));
      console.log(`[audio] pruned orphan: ${obj.Key}`);
      removed += 1;
    }
    token = out.NextContinuationToken;
  } while (token);
  return removed;
}

async function processPost(
  filePath: string,
  cache: AudioCache,
  openai: OpenAI,
  s3: S3Client | null,
  r2PublicUrl: string,
  forceRegen: boolean,
): Promise<Result> {
  const slug = path.basename(filePath).replace(/\.mdx?$/, '');
  const source = fs.readFileSync(filePath, 'utf-8');
  const { data } = matter(source);

  if (data.status !== 'published') return { slug, status: 'skipped' };
  if (data.audio === 'disabled') return { slug, status: 'skipped' };

  const voice: Voice = (data.audioVoice as Voice | undefined) ?? DEFAULT_VOICE;
  const script = preprocessForTTS(source);
  if (!script.trim()) {
    console.warn(`[audio] ${slug}: empty narration script; skipping.`);
    return { slug, status: 'skipped' };
  }
  const hashInput = `${script}|${voice}|${MODEL}|v${PREPROCESSOR_VERSION}`;
  const scriptHash = shaHex(hashInput);

  const existing = cache[slug];
  // Cache hit requires BOTH the hash to match AND the same-origin MP3
  // to exist on disk. Without the file check we'd skip regeneration
  // when an old cache entry points at a URL that's no longer reachable
  // (e.g. when this script's storage strategy changes).
  const localFileExists = existing
    ? fs.existsSync(path.join(PUBLIC_AUDIO_DIR, `${existing.scriptHash}.mp3`))
    : false;
  if (!forceRegen && existing && existing.scriptHash === scriptHash && localFileExists) {
    return { slug, status: 'cached' };
  }

  const chunks = chunkScript(script);
  console.log(`[audio] ${slug}: ${script.length} chars, ${chunks.length} chunk(s), voice=${voice}`);

  // Generate.
  const buffers: Buffer[] = [];
  for (let i = 0; i < chunks.length; i += 1) {
    try {
      const buf = await callTTS(openai, chunks[i], voice);
      buffers.push(buf);
    } catch (err) {
      const msg = (err as Error).message;
      console.warn(`[audio] ${slug}: TTS chunk ${i + 1}/${chunks.length} failed: ${msg}`);
      return { slug, status: 'error', error: msg };
    }
  }
  const mp3 = Buffer.concat(buffers);
  const duration = await durationFromMp3(mp3);

  // Write the same-origin copy first. This is what the player loads;
  // failing to write it here means there's no audio to render, so it's
  // a hard error for this post. R2 follows as best-effort.
  try {
    fs.mkdirSync(PUBLIC_AUDIO_DIR, { recursive: true });
    fs.writeFileSync(path.join(PUBLIC_AUDIO_DIR, `${scriptHash}.mp3`), mp3);
  } catch (err) {
    const msg = (err as Error).message;
    console.warn(`[audio] ${slug}: local write failed: ${msg}`);
    return { slug, status: 'error', error: msg };
  }

  // R2 mirror — best effort. If it fails, log and move on; the
  // GitHub Pages copy keeps the player working.
  let mirror: string | undefined;
  if (s3 && r2PublicUrl) {
    try {
      await uploadToR2(s3, `audio/${scriptHash}.mp3`, mp3);
      mirror = `${r2PublicUrl.replace(/\/$/, '')}/audio/${scriptHash}.mp3`;
    } catch (err) {
      console.warn(`[audio] ${slug}: R2 mirror upload failed (non-fatal): ${(err as Error).message}`);
    }
  }

  cache[slug] = {
    url: `${PUBLIC_AUDIO_URL_PREFIX}/${scriptHash}.mp3`,
    ...(mirror ? { mirror } : {}),
    duration,
    voice,
    model: MODEL,
    preprocessorVersion: PREPROCESSOR_VERSION,
    scriptHash,
    scriptLength: script.length,
    bytes: mp3.length,
    generatedAt: new Date().toISOString(),
  };

  const cost = estimateCost(script.length);
  console.log(
    `[audio] ${slug}: ${script.length} chars, ${chunks.length} chunks, ${(mp3.length / 1024).toFixed(0)} KB, ` +
      `${duration}s, generated $${cost.toFixed(2)}`,
  );

  return { slug, status: 'generated', cost };
}

async function main() {
  const onlySlug = (process.env.ONLY_SLUG || '').trim();
  const forceRegen = (process.env.FORCE_REGEN || '').toLowerCase() === 'true';
  const cleanup = process.argv.includes('--cleanup');

  if (!process.env.OPENAI_API_KEY) {
    console.warn('[audio] OPENAI_API_KEY not set; skipping audio generation entirely.');
    return;
  }

  // R2 is now optional — same-origin GitHub Pages serving is the
  // primary path. If R2 secrets are present, we mirror to it as a
  // best-effort backup; otherwise the script proceeds without a mirror.
  const r2PublicUrl = (process.env.R2_PUBLIC_URL || '').trim();
  const s3 = makeS3();
  if (!s3 || !r2PublicUrl) {
    console.warn('[audio] R2 credentials incomplete; mirror upload disabled (still generating same-origin MP3s).');
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const cache = readCache();

  const files = fs
    .readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith('.mdx') || f.endsWith('.md'))
    .filter((f) => !onlySlug || path.basename(f).replace(/\.mdx?$/, '') === onlySlug)
    .map((f) => path.join(BLOG_DIR, f));

  if (files.length === 0) {
    console.log('[audio] no posts to process.');
    return;
  }

  const results: Result[] = [];
  for (const f of files) {
    try {
      results.push(await processPost(f, cache, openai, s3, r2PublicUrl, forceRegen));
    } catch (err) {
      const slug = path.basename(f).replace(/\.mdx?$/, '');
      console.warn(`[audio] ${slug}: unexpected error: ${(err as Error).message}`);
      results.push({ slug, status: 'error', error: (err as Error).message });
    }
  }

  // Persist the cache regardless of partial failures so the next run
  // resumes from the latest committed state.
  writeCache(cache);

  // Local prune — drop any MP3 in public/audio/ that isn't referenced
  // by the current cache. Keeps the repo clean as voice/content
  // changes evolve and old hashes go stale. Always runs; cheap.
  try {
    const localRemoved = pruneLocal(cache);
    if (localRemoved > 0) console.log(`[audio] local prune removed ${localRemoved} orphan file(s) from public/audio/.`);
  } catch (err) {
    console.warn(`[audio] local prune failed: ${(err as Error).message}`);
  }

  // Optional R2 orphan cleanup (--cleanup flag).
  if (cleanup && s3) {
    try {
      const removed = await pruneOrphans(s3, cache);
      console.log(`[audio] R2 cleanup removed ${removed} orphan object(s).`);
    } catch (err) {
      console.warn(`[audio] R2 cleanup failed: ${(err as Error).message}`);
    }
  }

  const generated = results.filter((r) => r.status === 'generated').length;
  const cached = results.filter((r) => r.status === 'cached').length;
  const skipped = results.filter((r) => r.status === 'skipped').length;
  const errors = results.filter((r) => r.status === 'error').length;
  const totalCost = results
    .filter((r) => r.status === 'generated')
    .reduce((sum, r) => sum + (r.cost ?? 0), 0);
  console.log(
    `[audio] summary: ${generated} generated, ${cached} cached, ${skipped} skipped, ${errors} errors, ` +
      `estimated cost $${totalCost.toFixed(2)}`,
  );
}

main().catch((err) => {
  console.warn(`[audio] top-level error: ${(err as Error).message}`);
  // Exit 0 so the workflow keeps going.
  process.exit(0);
});
