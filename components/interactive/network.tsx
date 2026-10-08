'use client';

/**
 * The network every playground on the page talks to: QRDX testnet by default, a
 * node on this machine, or any node URL. Chosen once, remembered in this browser.
 * Every request goes from the reader's browser straight to the node; the docs site
 * has no backend.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type NetworkId = 'testnet' | 'local' | 'custom';

export interface DocsNetwork {
  id: NetworkId;
  label: string;
  /** Node REST base (GET /get_status …). */
  node: string;
  /** JSON-RPC endpoint. */
  rpc: string;
  /** WebSocket stream. */
  ws: string;
  /** trade.qrdx.org API for this network. */
  trade: string;
  /** The profile service for this network. */
  profiles: string;
  /** Explorer, for links. */
  explorer: string;
}

const PRESETS: Record<Exclude<NetworkId, 'custom'>, DocsNetwork> = {
  testnet: {
    id: 'testnet',
    label: 'Testnet',
    node: 'https://test.qrdx.org',
    rpc: 'https://test.qrdx.org/rpc',
    ws: 'wss://test.qrdx.org/ws',
    trade: 'https://trade.qrdx.org/api/v1-test',
    profiles: 'https://trade.qrdx.org/api/profiles/v1/testnet',
    explorer: 'https://explorer.qrdx.org',
  },
  local: {
    id: 'local',
    label: 'Local node',
    node: 'http://127.0.0.1:3007',
    rpc: 'http://127.0.0.1:3007/rpc',
    ws: 'ws://127.0.0.1:3007/ws',
    trade: 'http://127.0.0.1:3100/api/v1-test',
    profiles: 'http://127.0.0.1:8787/api/profiles/v1/testnet',
    explorer: 'http://localhost:3000',
  },
};

function custom(url: string): DocsNetwork {
  const node = url.replace(/\/+$/, '').replace(/\/rpc$/, '');
  return {
    id: 'custom',
    label: new URL(node).host,
    node,
    rpc: `${node}/rpc`,
    ws: `${node.replace(/^http/, 'ws')}/ws`,
    trade: PRESETS.testnet.trade,
    profiles: PRESETS.testnet.profiles,
    explorer: PRESETS.testnet.explorer,
  };
}

const KEY = 'qrdx-docs:network';

interface Ctx {
  network: DocsNetwork;
  customUrl: string;
  select: (id: NetworkId, customUrl?: string) => void;
}

const NetworkCtx = createContext<Ctx | null>(null);

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [id, setId] = useState<NetworkId>('testnet');
  const [customUrl, setCustomUrl] = useState('');

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null') as { id: NetworkId; customUrl?: string } | null;
      if (saved?.id === 'custom' && saved.customUrl) {
        setCustomUrl(saved.customUrl);
        setId('custom');
      } else if (saved?.id === 'local') setId('local');
    } catch {
      /* testnet */
    }
  }, []);

  const select = useCallback((next: NetworkId, url?: string) => {
    if (next === 'custom' && url) setCustomUrl(url);
    setId(next);
    try {
      localStorage.setItem(KEY, JSON.stringify({ id: next, customUrl: url ?? customUrl }));
    } catch {
      /* a preference only */
    }
  }, [customUrl]);

  const network = useMemo(() => {
    if (id === 'custom' && customUrl) {
      try {
        return custom(customUrl);
      } catch {
        return PRESETS.testnet;
      }
    }
    return id === 'local' ? PRESETS.local : PRESETS.testnet;
  }, [id, customUrl]);

  return <NetworkCtx.Provider value={{ network, customUrl, select }}>{children}</NetworkCtx.Provider>;
}

export function useNetwork(): Ctx {
  const v = useContext(NetworkCtx);
  if (!v) throw new Error('useNetwork outside NetworkProvider');
  return v;
}

/** A compact network switch for a playground's header. */
export function NetworkPicker() {
  const { network, customUrl, select } = useNetwork();
  return (
    <label className="inline-flex items-center gap-1.5 text-xs text-fd-muted-foreground">
      <span className={`h-1.5 w-1.5 rounded-full ${network.id === 'testnet' ? 'bg-bid' : 'bg-warn'}`} />
      <select
        aria-label="Network"
        value={network.id}
        onChange={(e) => {
          const v = e.target.value as NetworkId;
          if (v === 'custom') {
            const url = window.prompt('Node URL (REST base; JSON-RPC is <url>/rpc)', customUrl || 'http://127.0.0.1:3007');
            if (url) select('custom', url);
          } else select(v);
        }}
        className="cursor-pointer rounded-md border border-fd-border bg-fd-background px-1.5 py-0.5 text-xs text-fd-foreground outline-none hover:bg-fd-accent"
      >
        <option value="testnet">Testnet</option>
        <option value="local">Local node</option>
        <option value="custom">{network.id === 'custom' ? network.label : 'Custom…'}</option>
      </select>
    </label>
  );
}

// ─── clients ──────────────────────────────────────────────────────────────────

export interface CallResult {
  ok: boolean;
  status: number;
  ms: number;
  body: unknown;
  error?: string;
}

async function timed(url: string, init?: RequestInit): Promise<CallResult> {
  const t0 = performance.now();
  try {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(20_000) });
    const text = await res.text();
    let body: unknown = text;
    try {
      body = JSON.parse(text);
    } catch {
      /* not JSON */
    }
    return { ok: res.ok, status: res.status, ms: Math.round(performance.now() - t0), body };
  } catch (e) {
    const msg = (e as Error).name === 'TimeoutError' ? 'timed out after 20 s' : (e as Error).message;
    return { ok: false, status: 0, ms: Math.round(performance.now() - t0), body: null, error: `Could not reach ${new URL(url).host}: ${msg}` };
  }
}

export function rpcRequest(net: DocsNetwork, method: string, params: unknown) {
  return timed(net.rpc, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
}

export function queryString(query: Record<string, string | number | boolean | undefined | null>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== null && v !== '') q.set(k, String(v));
  const s = q.toString();
  return s ? `?${s}` : '';
}

export type RestApi = 'node' | 'trade' | 'profiles';

export function restRequest(net: DocsNetwork, api: RestApi, path: string, query: Record<string, string> = {}) {
  const base = api === 'trade' ? net.trade : api === 'profiles' ? net.profiles : net.node;
  return timed(`${base}${path}${queryString(query)}`);
}
