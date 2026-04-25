/** @jsxImportSource preact */
/**
 * Photo lightbox island.
 *
 * One <dialog> per page. Photo data comes from a sibling
 * <script type="application/json" id="photo-lightbox-data"> block written
 * by /photos/index.astro. Triggers are any element with
 * `[data-lightbox-trigger="<slug>"]`.
 *
 * Controls (per spec):
 *   keyboard: Esc / ← / → / + / - / 0 / D
 *   mouse:    scroll wheel zoom · drag-pan when zoomed · double-click toggles fit/2x
 *   touch:    pinch-zoom · drag-pan · swipe nav (when not zoomed)
 *   URL hash: #photo=<slug> for shareable view
 *
 * Preloads next/prev image when current opens. Honors prefers-reduced-motion.
 *
 * No PhotoSwipe — built bespoke to fit the Technical Editorial aesthetic.
 */

import { useEffect, useRef, useState, useCallback } from 'preact/hooks';

interface ExifStrip { camera?: string; lens?: string; focal?: string; aperture?: string; shutter?: string; iso?: string }

interface PhotoData {
  slug: string;
  title: string;
  date: string;        // pre-formatted YYYY-MM-DD
  location?: string;
  caption?: string;
  tags: string[];
  src: string;         // optimised display image (e.g. astro-generated 2400w jpg)
  fullSrc: string;     // original / largest available, used for download
  width: number;
  height: number;
  exif?: ExifStrip;
}

declare global {
  interface Window {
    __photoLightboxData?: PhotoData[];
  }
}

const REDUCED_MOTION =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function loadData(): PhotoData[] {
  if (typeof window !== 'undefined' && window.__photoLightboxData) return window.__photoLightboxData;
  const el = typeof document !== 'undefined' ? document.getElementById('photo-lightbox-data') : null;
  if (!el?.textContent) return [];
  try {
    const parsed = JSON.parse(el.textContent) as PhotoData[];
    if (typeof window !== 'undefined') window.__photoLightboxData = parsed;
    return parsed;
  } catch {
    return [];
  }
}

function exifLine(e?: ExifStrip): string | null {
  if (!e) return null;
  const parts = [e.camera, e.lens, e.focal, e.aperture, e.shutter, e.iso].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : null;
}

export default function PhotoLightbox() {
  const photos = loadData();
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dialogRef = useRef<HTMLDialogElement>(null);

  const open = useCallback((slug: string) => {
    const i = photos.findIndex((p) => p.slug === slug);
    if (i < 0) return;
    setOpenIndex(i);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [photos]);

  const close = useCallback(() => {
    setOpenIndex(null);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    if (typeof history !== 'undefined' && location.hash.startsWith('#photo=')) {
      history.replaceState(null, '', location.pathname + location.search);
    }
  }, []);

  const goto = useCallback(
    (delta: number) => {
      setOpenIndex((cur) => {
        if (cur === null) return cur;
        const next = (cur + delta + photos.length) % photos.length;
        return next;
      });
      setZoom(1);
      setPan({ x: 0, y: 0 });
    },
    [photos.length],
  );

  const zoomBy = useCallback((factor: number) => {
    setZoom((z) => {
      const next = Math.max(1, Math.min(8, z * factor));
      if (next === 1) setPan({ x: 0, y: 0 });
      return next;
    });
  }, []);

  // ─── trigger wiring ────────────────────────────────────────────
  useEffect(() => {
    const onClick = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const trigger = target.closest<HTMLElement>('[data-lightbox-trigger]');
      if (!trigger) return;
      // Don't intercept clicks on the EXIF (i) button.
      if (target.closest('[data-exif-trigger]')) return;
      e.preventDefault();
      const slug = trigger.dataset.lightboxTrigger ?? '';
      if (slug) open(slug);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [open]);

  // ─── URL hash sync (shareable views) ─────────────────────────
  useEffect(() => {
    const fromHash = () => {
      const m = location.hash.match(/^#photo=([\w-]+)$/);
      if (m) open(m[1]);
    };
    fromHash();
    window.addEventListener('hashchange', fromHash);
    return () => window.removeEventListener('hashchange', fromHash);
  }, [open]);

  useEffect(() => {
    if (openIndex === null) return;
    const slug = photos[openIndex].slug;
    if (location.hash !== `#photo=${slug}`) {
      history.replaceState(null, '', `#photo=${slug}`);
    }
  }, [openIndex, photos]);

  // ─── show/hide native <dialog> ───────────────────────────────
  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    if (openIndex !== null && !dlg.open) dlg.showModal();
    if (openIndex === null && dlg.open) dlg.close();
  }, [openIndex]);

  // ─── keyboard ────────────────────────────────────────────────
  useEffect(() => {
    if (openIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); goto(-1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); goto(1); }
      else if (e.key === '+' || e.key === '=') { e.preventDefault(); zoomBy(1.4); }
      else if (e.key === '-' || e.key === '_') { e.preventDefault(); zoomBy(1 / 1.4); }
      else if (e.key === '0') { e.preventDefault(); setZoom(1); setPan({ x: 0, y: 0 }); }
      else if (e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        const link = document.getElementById('lightbox-download') as HTMLAnchorElement | null;
        link?.click();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openIndex, close, goto, zoomBy]);

  // ─── prefetch neighbours ─────────────────────────────────────
  useEffect(() => {
    if (openIndex === null) return;
    const next = photos[(openIndex + 1) % photos.length];
    const prev = photos[(openIndex - 1 + photos.length) % photos.length];
    [next, prev].forEach((p) => {
      if (p) {
        const img = new Image();
        img.src = p.src;
      }
    });
  }, [openIndex, photos]);

  // ─── pointer / touch ─────────────────────────────────────────
  const dragRef = useRef<{ startX: number; startY: number; panX: number; panY: number; pointerId: number } | null>(null);
  const pinchRef = useRef<{ startDist: number; startZoom: number } | null>(null);
  const swipeRef = useRef<{ startX: number; startTime: number } | null>(null);
  const touchPointsRef = useRef<Map<number, { x: number; y: number }>>(new Map());

  const onPointerDown = (e: PointerEvent) => {
    const tgt = e.currentTarget as HTMLElement;
    tgt.setPointerCapture(e.pointerId);
    touchPointsRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (touchPointsRef.current.size === 2) {
      const [a, b] = [...touchPointsRef.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      pinchRef.current = { startDist: d, startZoom: zoom };
      dragRef.current = null;
      swipeRef.current = null;
      return;
    }
    if (zoom > 1) {
      dragRef.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y, pointerId: e.pointerId };
    } else if (e.pointerType !== 'mouse') {
      // Track potential swipe (touch only at zoom 1).
      swipeRef.current = { startX: e.clientX, startTime: Date.now() };
    }
  };

  const onPointerMove = (e: PointerEvent) => {
    if (touchPointsRef.current.has(e.pointerId)) {
      touchPointsRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }
    if (pinchRef.current && touchPointsRef.current.size === 2) {
      const [a, b] = [...touchPointsRef.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const factor = d / pinchRef.current.startDist;
      const next = Math.max(1, Math.min(8, pinchRef.current.startZoom * factor));
      setZoom(next);
      if (next === 1) setPan({ x: 0, y: 0 });
      return;
    }
    if (dragRef.current && e.pointerId === dragRef.current.pointerId) {
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      setPan({ x: dragRef.current.panX + dx, y: dragRef.current.panY + dy });
    }
  };

  const onPointerUp = (e: PointerEvent) => {
    touchPointsRef.current.delete(e.pointerId);
    if (touchPointsRef.current.size < 2) pinchRef.current = null;
    if (dragRef.current?.pointerId === e.pointerId) dragRef.current = null;
    // Swipe? Touch-only, fired on the FIRST pointer up while at zoom 1.
    if (swipeRef.current && zoom === 1) {
      const dx = e.clientX - swipeRef.current.startX;
      const dt = Date.now() - swipeRef.current.startTime;
      if (Math.abs(dx) > 80 && dt < 600) {
        if (dx < 0) goto(1);
        else goto(-1);
      }
      swipeRef.current = null;
    }
  };

  const onWheel = (e: WheelEvent) => {
    if (openIndex === null) return;
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    zoomBy(factor);
  };

  const onDoubleClick = () => zoomBy(zoom > 1 ? 1 / zoom : 2);

  // Close on backdrop click — `<dialog>` reports clicks on itself when
  // they land on the ::backdrop pseudo-element.
  const onBackdropClick = (e: Event) => {
    if (e.target === dialogRef.current) close();
  };

  if (photos.length === 0) {
    // No photos — render the dialog stub anyway so the page builds
    // identically whether or not photos exist yet.
    return <dialog ref={dialogRef} class="lightbox" />;
  }

  const cur = openIndex !== null ? photos[openIndex] : null;
  const ex = exifLine(cur?.exif);
  const transform = `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`;

  return (
    <dialog ref={dialogRef} class="lightbox" onClick={onBackdropClick} onClose={close}>
      {cur && (
        <div class="lightbox-inner" onWheel={onWheel}>
          {/* header — title + date + location */}
          <header class="lb-head">
            <div>
              <p class="lb-title">{cur.title}</p>
              <p class="lb-meta">
                <time datetime={cur.date}>{cur.date}</time>
                {cur.location && <> · {cur.location}</>}
                <span class="lb-counter"> · {(openIndex ?? 0) + 1} / {photos.length}</span>
              </p>
            </div>
            <div class="lb-actions">
              <a
                id="lightbox-download"
                class="lb-btn"
                href={cur.fullSrc}
                download={`${cur.slug}.jpg`}
                aria-label="Download photo"
                title="Download (D)"
              ><span aria-hidden="true">↓</span></a>
              <button
                type="button"
                class="lb-btn"
                onClick={close}
                aria-label="Close"
                title="Close (Esc)"
              ><span aria-hidden="true">✕</span></button>
            </div>
          </header>

          {/* image stage */}
          <div
            class={`lb-stage${zoom > 1 ? ' lb-zoomed' : ''}`}
            onPointerDown={onPointerDown as any}
            onPointerMove={onPointerMove as any}
            onPointerUp={onPointerUp as any}
            onPointerCancel={onPointerUp as any}
            onDblClick={onDoubleClick}
          >
            <img
              src={cur.src}
              alt={cur.caption || cur.title}
              width={cur.width}
              height={cur.height}
              draggable={false}
              style={{
                transform,
                transition: REDUCED_MOTION ? 'none' : 'transform 180ms ease-out',
              }}
            />
          </div>

          {/* nav arrows */}
          {photos.length > 1 && (
            <>
              <button
                type="button"
                class="lb-nav lb-prev"
                onClick={() => goto(-1)}
                aria-label="Previous photo"
                title="Previous (←)"
              >‹</button>
              <button
                type="button"
                class="lb-nav lb-next"
                onClick={() => goto(1)}
                aria-label="Next photo"
                title="Next (→)"
              >›</button>
            </>
          )}

          {/* caption + exif strip */}
          <footer class="lb-foot">
            {cur.caption && <p class="lb-cap">{cur.caption}</p>}
            {ex && <p class="lb-exif">{ex}</p>}
            {cur.tags.length > 0 && (
              <p class="lb-tags">{cur.tags.map((t) => <span class="lb-tag">{t}</span>)}</p>
            )}
          </footer>
        </div>
      )}
    </dialog>
  );
}
