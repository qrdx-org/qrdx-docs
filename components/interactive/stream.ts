'use client';

import { useEffect, useRef, useState } from 'react';
import type { DocsNetwork } from './network';

export interface BlockEvent {
  height: number;
  finalizedEpoch: number | null;
  /** When it arrived here, ms (performance.now()). */
  at: number;
}

/**
 * The node's `blocks` stream (wss://…/ws, docs/build/streams): every block as it commits, with
 * the finalized epoch. `onBlock` runs for each one; the hook returns whether it is connected.
 */
export function useBlockStream(network: DocsNetwork, onBlock: (b: BlockEvent) => void): boolean {
  const [connected, setConnected] = useState(false);
  const cb = useRef(onBlock);
  useEffect(() => {
    cb.current = onBlock;
  });

  useEffect(() => {
    let closed = false;
    let ws: WebSocket | null = null;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const open = () => {
      try {
        ws = new WebSocket(network.ws);
      } catch {
        return;
      }
      ws.onopen = () => !closed && setConnected(true);
      ws.onclose = () => {
        if (closed) return;
        setConnected(false);
        retry = setTimeout(open, 3000);
      };
      ws.onmessage = (m) => {
        const e = JSON.parse(String(m.data)) as { type?: string; height?: number; finalized_epoch?: number };
        if (e.type === 'block' && typeof e.height === 'number' && !closed)
          cb.current({ height: e.height, finalizedEpoch: e.finalized_epoch ?? null, at: performance.now() });
      };
    };
    open();
    return () => {
      closed = true;
      clearTimeout(retry);
      ws?.close();
      setConnected(false);
    };
  }, [network]);

  return connected;
}

/** A number from 0 to 1 that a block height always gives the same way (where its ripple falls). */
export function scatter(n: number, salt = 0): number {
  let x = (n ^ (salt * 0x9e3779b1)) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b) >>> 0;
  return ((x ^ (x >>> 16)) >>> 0) / 0xffffffff;
}

/** The page's ink, as `r, g, b`, read from the theme (for canvases). */
export function inkRgb(el: Element = document.documentElement): string {
  const probe = document.createElement('span');
  probe.style.color = 'var(--color-fd-foreground)';
  el.appendChild(probe);
  const c = getComputedStyle(probe).color;
  probe.remove();
  const m = c.match(/[\d.]+/g);
  return m ? m.slice(0, 3).join(', ') : '128, 128, 128';
}

/** Whether the reader asked for less motion. */
export function reducedMotion(): boolean {
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}
