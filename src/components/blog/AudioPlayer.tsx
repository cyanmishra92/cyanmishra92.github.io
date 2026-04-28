/** @jsxImportSource preact */
/**
 * Audio player for narrated blog posts.
 *
 * Shape: sharp 2px bordered horizontal strip, mono captions, accent
 * color for the play state and progress fill. Uses the native <audio>
 * element so we don't ship a third-party player library — the browser
 * already knows how to decode an MP3.
 *
 * Lazy: `preload="none"` until first play. Saves bandwidth on the ~80%
 * of visitors who'll read but not listen. Resume position is stored
 * in localStorage as `audio:<slug>` and updated every 5s while
 * playing. Playback rate is shared across posts as `audio:speed`.
 *
 * Failure: if the source 404s or fails to load, we hide the chrome
 * and show a single `// audio unavailable` line. The post still reads
 * normally.
 */

import { useEffect, useMemo, useRef, useState } from 'preact/hooks';

interface Props {
  slug: string;
  /** Primary same-origin URL (served from public/audio/). */
  url: string;
  /** Optional R2 mirror used as a fallback when the primary load fails. */
  mirror?: string;
  duration: number;
  voice: string;
  /** True when the post body includes <Cite>; surfaces the
   *  "citations omitted" honesty caption beneath the player. */
  hasCitations?: boolean;
}

const SPEEDS = [0.75, 1, 1.25, 1.5];
const STORAGE_RATE = 'audio:speed';

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function AudioPlayer({ slug, url, mirror, duration, voice, hasCitations = false }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration);
  const [rate, setRate] = useState(1);
  const [error, setError] = useState(false);
  // Once we've fallen back to the mirror, we stick with it for this
  // session; flipping back and forth would just make a new failure
  // loop. The user can refresh to retry the primary.
  const [usingMirror, setUsingMirror] = useState(false);
  const activeUrl = usingMirror && mirror ? mirror : url;

  const positionKey = useMemo(() => `audio:${slug}`, [slug]);

  // Hydrate persisted speed once.
  useEffect(() => {
    try {
      const stored = Number.parseFloat(localStorage.getItem(STORAGE_RATE) ?? '1');
      if (SPEEDS.includes(stored)) setRate(stored);
    } catch {
      // ignore
    }
  }, []);

  // Apply rate to the underlying element whenever it changes.
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = rate;
    try {
      localStorage.setItem(STORAGE_RATE, String(rate));
    } catch {
      // ignore
    }
  }, [rate]);

  // Persist current position every 5s while playing.
  useEffect(() => {
    if (!isPlaying) return;
    const id = window.setInterval(() => {
      const cur = audioRef.current?.currentTime ?? 0;
      try {
        if (cur > 1) localStorage.setItem(positionKey, String(cur));
      } catch {
        // ignore
      }
    }, 5000);
    return () => window.clearInterval(id);
  }, [isPlaying, positionKey]);

  function toggle() {
    const el = audioRef.current;
    if (!el) return;
    // A click is the user's intent to play — clear any prior error so
    // they can retry. Ditto for an explicit `audio.load()` to reset
    // the media element's network state when it has been poisoned by
    // a previous transient failure.
    if (error) {
      setError(false);
      try { el.load(); } catch { /* ignore */ }
    }
    if (el.paused) {
      // Resume from last position on first play of this slug.
      if (el.currentTime < 1) {
        try {
          const stored = Number.parseFloat(localStorage.getItem(positionKey) ?? '0');
          if (Number.isFinite(stored) && stored > 5 && stored < (el.duration || Infinity) - 5) {
            el.currentTime = stored;
          }
        } catch {
          // ignore
        }
      }
      void el.play().catch((err) => {
        // AbortError fires when a user-initiated pause races with a
        // pending play; that's not a real failure. NotAllowedError
        // would only fire on autoplay-blocked code paths, which this
        // isn't — but treat anything else as a real error.
        const name = (err as DOMException | Error).name;
        if (name === 'AbortError') return;
        // eslint-disable-next-line no-console
        console.error('[AudioPlayer] play() rejected:', err);
        // First failure with a mirror available: silently switch and
        // let the user click again. Second failure: surface the error.
        if (!usingMirror && mirror) {
          setUsingMirror(true);
          setError(false);
        } else {
          setError(true);
        }
      });
    } else {
      el.pause();
    }
  }

  function onScrub(e: Event) {
    const el = audioRef.current;
    if (!el) return;
    const next = Number.parseFloat((e.currentTarget as HTMLInputElement).value);
    el.currentTime = next;
    setCurrentTime(next);
  }

  function onKeyDown(e: KeyboardEvent) {
    const el = audioRef.current;
    if (!el) return;
    switch (e.key) {
      case ' ':
      case 'k':
        e.preventDefault();
        toggle();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        el.currentTime = Math.max(0, el.currentTime - 10);
        break;
      case 'ArrowRight':
        e.preventDefault();
        el.currentTime = Math.min(el.duration || Infinity, el.currentTime + 10);
        break;
      case 'ArrowUp':
        e.preventDefault();
        el.volume = Math.min(1, el.volume + 0.1);
        break;
      case 'ArrowDown':
        e.preventDefault();
        el.volume = Math.max(0, el.volume - 0.1);
        break;
      case 'm':
      case 'M':
        e.preventDefault();
        el.muted = !el.muted;
        break;
      case '0':
        e.preventDefault();
        el.currentTime = 0;
        break;
      default:
        break;
    }
  }

  const progress = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  return (
    <section
      class="audio-player my-6 border-2 border-border bg-surface"
      aria-labelledby={`audio-caption-${slug}`}
      onKeyDown={onKeyDown}
    >
      <p
        id={`audio-caption-${slug}`}
        class="border-b border-border px-4 py-2 font-mono text-[0.6875rem] uppercase tracking-eyebrow text-text-muted"
      >
        // listen — narrated by openai tts-1-hd, voice: {voice}
        {hasCitations && (
          <>
            <br />
            citations omitted; see post for full references
          </>
        )}
      </p>
      {error && (
        <p
          role="alert"
          class="border-b border-border px-4 py-2 font-mono text-[0.6875rem] uppercase tracking-eyebrow text-accent"
        >
          // playback failed — click play to retry, or open the .mp3 directly
        </p>
      )}
      <div class="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
        <button
          type="button"
          class="inline-flex h-9 w-9 shrink-0 items-center justify-center text-accent transition-colors hover:text-text"
          aria-label={isPlaying ? 'Pause' : 'Play'}
          aria-pressed={isPlaying}
          onClick={toggle}
        >
          {isPlaying ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <rect x="6" y="5" width="4" height="14" />
              <rect x="14" y="5" width="4" height="14" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <polygon points="6,4 20,12 6,20" />
            </svg>
          )}
        </button>

        <input
          type="range"
          min={0}
          max={totalDuration || 0}
          step={0.5}
          value={currentTime}
          onInput={onScrub}
          aria-label="Seek"
          class="audio-scrubber min-w-0 flex-1"
          style={{ '--audio-progress': `${progress}%` } as Record<string, string>}
        />

        <p class="font-mono text-xs tabular-nums text-text-muted whitespace-nowrap">
          <span class="text-accent">{formatTime(currentTime)}</span>
          <span class="mx-1">/</span>
          <span>{formatTime(totalDuration)}</span>
        </p>

        <div class="flex items-center gap-1">
          {SPEEDS.map((s) => {
            const active = rate === s;
            return (
              <button
                type="button"
                class={
                  'inline-flex items-center border px-2 py-px font-mono text-[0.6875rem] uppercase tracking-eyebrow transition-colors ' +
                  (active
                    ? 'border-accent text-accent'
                    : 'border-border text-text-muted hover:border-accent hover:text-accent')
                }
                aria-pressed={active}
                onClick={() => setRate(s)}
              >
                {s === 1 ? '1x' : `${s}x`}
              </button>
            );
          })}
        </div>

        <a
          href={activeUrl}
          download
          aria-label="Download MP3"
          class="inline-flex h-8 w-8 shrink-0 items-center justify-center text-text-muted transition-colors hover:text-accent"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </a>
      </div>

      {mirror && (
        <p class="border-t border-border px-4 py-2 font-mono text-[0.625rem] uppercase tracking-eyebrow text-text-muted">
          {usingMirror ? (
            <>// playing from cloudflare mirror</>
          ) : (
            <>
              // primary blocked? <a class="link-underline text-accent" href={mirror} rel="noopener noreferrer" target="_blank">play from mirror ↗</a>
            </>
          )}
        </p>
      )}

      <audio
        ref={audioRef}
        src={activeUrl}
        preload="none"
        onLoadedMetadata={() => {
          const el = audioRef.current;
          if (!el) return;
          if (Number.isFinite(el.duration) && el.duration > 0) setTotalDuration(el.duration);
          el.playbackRate = rate;
          // Reaching loadedmetadata means the request worked — clear
          // any error sticking around from a previous transient hiccup.
          if (error) setError(false);
        }}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime ?? 0)}
        onPlay={() => {
          setIsPlaying(true);
          if (error) setError(false);
        }}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          try {
            localStorage.removeItem(positionKey);
          } catch {
            // ignore
          }
        }}
        onError={(e) => {
          // Browsers fire bare `error` events for benign transitions
          // (e.g., during preload="none" state churn). Only treat as a
          // real failure when MediaError carries a non-zero code.
          const mediaError = (e.currentTarget as HTMLAudioElement).error;
          if (!mediaError || mediaError.code === 0) return;
          // eslint-disable-next-line no-console
          console.error('[AudioPlayer] media error', mediaError.code, mediaError.message);
          // Auto-fall-back to the mirror once. If we already failed
          // on the mirror, surface the error.
          if (!usingMirror && mirror) {
            setUsingMirror(true);
            // Re-issue load on the swapped src.
            queueMicrotask(() => {
              try { audioRef.current?.load(); } catch { /* ignore */ }
            });
            return;
          }
          setError(true);
        }}
      />
    </section>
  );
}
