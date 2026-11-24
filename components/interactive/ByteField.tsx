'use client';

import { useEffect, useRef, useState } from 'react';
import { inkRgb } from './stream';

/** CSS pixels per byte. Every field uses the same, so fields side by side are to scale. */
export const CELL = 6;

/**
 * Bytes as a halftone: one dot per byte, as large as its value, in rows as wide as the field.
 * Without `bytes` it shows only a size (`count` empty rings), for comparison. Flipped bytes are
 * drawn as rings in the failure colour; `onPick` makes each byte clickable.
 */
export function ByteField({
  bytes,
  count,
  flipped,
  onPick,
  label,
}: {
  bytes?: Uint8Array | null;
  count: number;
  flipped?: ReadonlySet<number>;
  onPick?: (index: number) => void;
  label: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [cols, setCols] = useState(64);
  const [hover, setHover] = useState<number | null>(null);
  const rows = Math.ceil(count / cols);

  useEffect(() => {
    const el = ref.current?.parentElement;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setCols(Math.max(16, Math.min(64, Math.floor(e.contentRect.width / CELL)))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const draw = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = cols * CELL;
      const h = rows * CELL;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const ink = inkRgb();
      const dots = new Path2D();
      const rings = new Path2D();
      const bad = new Path2D();
      for (let i = 0; i < count; i++) {
        const x = (i % cols) * CELL + CELL / 2;
        const y = Math.floor(i / cols) * CELL + CELL / 2;
        if (!bytes) {
          rings.moveTo(x + CELL * 0.3, y);
          rings.arc(x, y, CELL * 0.3, 0, Math.PI * 2);
          continue;
        }
        const hit = flipped?.has(i);
        // A flipped byte shows full size, whatever its value, so it can be found again.
        const r = hit ? CELL * 0.46 : (CELL / 2) * (0.16 + 0.8 * Math.sqrt(bytes[i] / 255));
        const target = hit ? bad : dots;
        target.moveTo(x + r, y);
        target.arc(x, y, r, 0, Math.PI * 2);
      }
      ctx.fillStyle = `rgba(${ink}, 0.85)`;
      ctx.fill(dots);
      ctx.strokeStyle = `rgba(${ink}, 0.35)`;
      ctx.lineWidth = 1;
      ctx.stroke(rings);
      ctx.fillStyle = getComputedStyle(canvas).getPropertyValue('--color-ask') || 'red';
      ctx.fill(bad);
      if (hover !== null && onPick) {
        ctx.strokeStyle = `rgba(${ink}, 0.9)`;
        ctx.strokeRect((hover % cols) * CELL + 0.5, Math.floor(hover / cols) * CELL + 0.5, CELL - 1, CELL - 1);
      }
    };
    draw();
    const theme = new MutationObserver(draw);
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => theme.disconnect();
  }, [bytes, count, cols, rows, flipped, hover, onPick]);

  const at = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const i = Math.floor((e.clientY - r.top) / CELL) * cols + Math.floor((e.clientX - r.left) / CELL);
    return i >= 0 && i < count ? i : null;
  };

  return (
    <figure className="my-0 w-fit max-w-full">
      <canvas
        ref={ref}
        role={onPick ? 'img' : undefined}
        aria-label={label}
        className={onPick ? 'cursor-crosshair touch-none' : undefined}
        onPointerMove={onPick ? (e) => setHover(at(e)) : undefined}
        onPointerLeave={onPick ? () => setHover(null) : undefined}
        onPointerDown={
          onPick
            ? (e) => {
                const i = at(e);
                if (i !== null) onPick(i);
              }
            : undefined
        }
      />
      <figcaption className="mt-1.5 flex flex-wrap justify-between gap-x-3 font-mono text-[10.5px] leading-snug text-fd-muted-foreground">
        <span>{label}</span>
        <span>
          {hover !== null && bytes ? `byte ${hover.toLocaleString()} = 0x${bytes[hover].toString(16).padStart(2, '0')}` : `${count.toLocaleString()} bytes`}
        </span>
      </figcaption>
    </figure>
  );
}
