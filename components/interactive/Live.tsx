'use client';

import { useEffect, useState } from 'react';
import { Activity, Blocks, Clock, Hash, Layers } from 'lucide-react';
import { NetworkPicker, rpcRequest, useNetwork } from './network';

interface Status {
  height: number | null;
  epoch: number | null;
  interval: number | null;
  chainId: number | null;
  connected: boolean;
  error: string | null;
}

/** The chosen network, live: height and finalized epoch from the node's stream, block interval over the last 50 blocks, chain id. */
export function LiveStatus() {
  const { network } = useNetwork();
  const [s, setS] = useState<Status>({ height: null, epoch: null, interval: null, chainId: null, connected: false, error: null });

  useEffect(() => {
    let closed = false;
    setS({ height: null, epoch: null, interval: null, chainId: null, connected: false, error: null });
    const rpc = async (method: string, ...params: unknown[]) => {
      const r = await rpcRequest(network, method, params);
      const body = r.body as { result?: unknown } | null;
      if (r.error || !body || !('result' in body)) throw new Error(r.error ?? `${method} failed`);
      return body.result;
    };
    (async () => {
      try {
        const [chainHex, latest] = (await Promise.all([rpc('eth_chainId'), rpc('eth_getBlockByNumber', 'latest', false)])) as [string, { number: string; timestamp: string }];
        const n = parseInt(latest.number, 16);
        const back = Math.max(0, n - 50);
        const earlier = (await rpc('eth_getBlockByNumber', `0x${back.toString(16)}`, false)) as { timestamp: string };
        const dt = parseInt(latest.timestamp, 16) - parseInt(earlier.timestamp, 16);
        if (!closed) setS((p) => ({ ...p, chainId: parseInt(chainHex, 16), height: p.height ?? n, interval: n > back ? dt / (n - back) : null }));
      } catch (e) {
        if (!closed) setS((p) => ({ ...p, error: `${network.label}: ${(e as Error).message}` }));
      }
    })();

    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(network.ws);
      ws.onopen = () => !closed && setS((p) => ({ ...p, connected: true }));
      ws.onclose = () => !closed && setS((p) => ({ ...p, connected: false }));
      ws.onmessage = (m) => {
        const e = JSON.parse(String(m.data)) as { type?: string; height?: number; finalized_epoch?: number };
        if (e.type === 'block' && !closed) setS((p) => ({ ...p, height: e.height ?? p.height, epoch: e.finalized_epoch ?? p.epoch }));
      };
    } catch {
      /* the RPC numbers still show */
    }
    return () => {
      closed = true;
      ws?.close();
    };
  }, [network]);

  const tiles = [
    { icon: Blocks, label: 'Block height', value: s.height?.toLocaleString() ?? '—' },
    { icon: Layers, label: 'Finalized epoch', value: s.epoch?.toLocaleString() ?? '—' },
    { icon: Clock, label: 'Block interval', value: s.interval ? `${s.interval.toFixed(1)} s` : '—', hint: 'last 50 blocks' },
    { icon: Hash, label: 'Chain ID', value: s.chainId?.toString() ?? '—', hint: s.chainId ? `0x${s.chainId.toString(16)}` : undefined },
  ];
  return (
    <div className="not-prose my-6 overflow-hidden rounded-xl border border-fd-border bg-fd-card">
      <div className="flex items-center justify-between border-b border-fd-border px-3 py-2 text-xs">
        <span className="inline-flex items-center gap-2 font-medium">
          <Activity className="h-3.5 w-3.5 text-fd-primary" />
          {network.label}, live
          <span className={`h-1.5 w-1.5 rounded-full ${s.connected ? 'animate-pulse bg-bid' : 'bg-fd-muted-foreground'}`} title={s.connected ? 'streaming' : 'not streaming'} />
        </span>
        <NetworkPicker />
      </div>
      {s.error ? (
        <p className="px-3 py-3 text-xs text-ask">{s.error}</p>
      ) : (
        <div className="grid grid-cols-2 divide-fd-border sm:grid-cols-4 sm:divide-x">
          {tiles.map((t) => (
            <div key={t.label} className="px-4 py-3">
              <div className="flex items-center gap-1.5 text-[11px] text-fd-muted-foreground">
                <t.icon className="h-3 w-3" /> {t.label}
              </div>
              <div className="num mt-0.5 text-lg font-semibold tracking-tight">{t.value}</div>
              {t.hint && <div className="text-[10.5px] text-fd-muted-foreground">{t.hint}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
