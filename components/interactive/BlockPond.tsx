'use client';

import { useEffect, useRef } from 'react';
import { useNetwork } from './network';
import { inkRgb, reducedMotion, scatter, useBlockStream } from './stream';

/** CSS pixels between dots; how fast a ring runs out (px/s); at most this many rings at once. */
const GRID = 11;
const SPEED = 150;
const RINGS = 14;

interface Ring {
  x: number;
  y: number;
  at: number;
  strength: number;
}

/**
 * The home page's backdrop: a still pond seen from above, printed as a halftone (a dot per grid
 * point, as large as the surface there is high). Every testnet block from the node's stream drops
 * a ring where its height scatters it; the reader's pointer leaves a wake, and a click a ring of
 * its own. Calm where the headline sits. Drawn on a 2D canvas, only while it is on screen; under
 * reduced motion, one still frame.
 */
export function BlockPond({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const rings = useRef<Ring[]>([]);
  const size = useRef({ w: 0, h: 0 });
  const { network } = useNetwork();

  const drop = (x: number, y: number, strength: number) => {
    rings.current.push({ x, y, at: performance.now(), strength });
    if (rings.current.length > RINGS) rings.current.shift();
  };

  useBlockStream(network, (b) => {
    const { w, h } = size.current;
    if (!w || reducedMotion()) return;
    drop(w * (0.06 + 0.88 * scatter(b.height, 1)), h * (0.1 + 0.75 * scatter(b.height, 2)), 0.75);
  });

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const still = reducedMotion();
    let ink = inkRgb();
    let raf = 0;
    let visible = true;
    let lastPointer = 0;

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      size.current = { w: r.width, h: r.height };
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(performance.now());
    };

    function draw(now: number) {
      const { w, h } = size.current;
      if (!ctx || !w) return;
      ctx.clearRect(0, 0, w, h);
      const t = still ? 0 : now / 1000;
      const live = rings.current.filter((r) => now - r.at < 9000);
      rings.current = live;
      const cx = w / 2;
      const cy = h * 0.42;
      const path = new Path2D();
      for (let y = GRID / 2; y < h; y += GRID) {
        for (let x = GRID / 2; x < w; x += GRID) {
          // A faint swell so the pond is never dead still, then each ring.
          let z = 0.16 * Math.sin(x * 0.011 + t * 0.35) * Math.sin(y * 0.016 - t * 0.27);
          for (const r of live) {
            const age = (now - r.at) / 1000;
            const off = Math.hypot(x - r.x, y - r.y) - age * SPEED;
            z += r.strength * Math.exp(-age * 0.85) * Math.exp(-((off / 28) ** 2)) * Math.cos(off * 0.14);
          }
          // Quieter behind the headline, fading into the page at the bottom.
          const e = Math.hypot((x - cx) / (w * 0.36), (y - cy) / (h * 0.36));
          const calm = (0.12 + 0.88 * Math.min(1, Math.max(0, (e - 0.5) / 0.6))) * Math.min(1, (h - y) / (h * 0.35));
          const rad = (GRID / 2) * Math.min(0.92, Math.max(0, (0.2 + 0.5 * z) * calm));
          if (rad < 0.35) continue;
          path.moveTo(x + rad, y);
          path.arc(x, y, rad, 0, Math.PI * 2);
        }
      }
      ctx.fillStyle = `rgba(${ink}, 0.36)`;
      ctx.fill(path);
    }

    let last = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (now - last < 33) return;
      last = now;
      draw(now);
    };

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      cancelAnimationFrame(raf);
      if (visible && !still && !document.hidden) raf = requestAnimationFrame(loop);
    });
    io.observe(canvas);
    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (visible && !still && !document.hidden) raf = requestAnimationFrame(loop);
    };
    document.addEventListener('visibilitychange', onVisibility);
    const theme = new MutationObserver(() => {
      ink = inkRgb();
      draw(performance.now());
    });
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    const local = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top, inside: e.clientY >= r.top && e.clientY <= r.bottom };
    };
    const onMove = (e: PointerEvent) => {
      const p = local(e);
      if (still || !p.inside || e.timeStamp - lastPointer < 110) return;
      lastPointer = e.timeStamp;
      drop(p.x, p.y, 0.32);
    };
    const onDown = (e: PointerEvent) => {
      const p = local(e);
      if (!still && p.inside) drop(p.x, p.y, 0.9);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      theme.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
    };
  }, []);

  return <canvas ref={ref} aria-hidden className={className} />;
}
