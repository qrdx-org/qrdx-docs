'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { cn } from '@/lib/cn';
import { CodeEditor } from './editor';
import { EXAMPLES, type ExampleId } from './examples';
import { NetworkPicker, restRequest, rpcRequest, useNetwork, type DocsNetwork } from './network';
import * as pq from './pq';
import { Badge, CopyButton, Frame, RunButton } from './ui';

/**
 * Editable JavaScript that runs live against the chosen network.
 *
 * The code runs in a sandboxed iframe (scripts only, an opaque origin: no access to
 * this page, its storage or cookies), created fresh for every run. Inside it are:
 *
 *   rpc(method, ...params)      JSON-RPC → result (throws on an RPC error)
 *   rest(path, query?)          node REST → result (unwraps {ok, result})
 *   trade(path)                 trade.qrdx.org API for the network → JSON
 *   pq.keygen(seed?) · pq.sign(message, secretKey, {raw}) · pq.verify(…)
 *   pq.address(publicKey) · pq.accountId(address) · hash.keccak256 · hash.blake2b256
 *   network                     { node, rpc, ws, trade, explorer }
 *   sleep(ms)
 *
 * and console.log / console.table print below. WebSocket and fetch work directly.
 */
export function CodeRunner({ example, code: initial, title, height }: { example?: ExampleId; code?: string; title?: string; height?: string }) {
  const source = (example ? EXAMPLES[example].code : initial ?? '').trim();
  const { network } = useNetwork();
  const [code, setCode] = useState(source);
  const [lines, setLines] = useState<Line[]>([]);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState<number | null>(null);
  const host = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement | null>(null);
  const started = useRef(0);
  const detach = useRef<(() => void) | null>(null);

  const stop = useCallback((note?: string) => {
    detach.current?.();
    detach.current = null;
    frame.current?.remove();
    frame.current = null;
    setRunning(false);
    setElapsed(Math.round(performance.now() - started.current));
    if (note) setLines((l) => [...l, { level: 'info', text: note }]);
  }, []);

  useEffect(() => () => {
    detach.current?.();
    frame.current?.remove();
  }, []);

  const run = useCallback(() => {
    frame.current?.remove();
    setLines([]);
    setElapsed(null);
    setRunning(true);
    started.current = performance.now();

    const iframe = document.createElement('iframe');
    iframe.setAttribute('sandbox', 'allow-scripts');
    iframe.style.display = 'none';
    iframe.srcdoc = RUNTIME;
    frame.current = iframe;
    host.current?.appendChild(iframe);

    const timeout = setTimeout(() => {
      if (frame.current === iframe) stop('Stopped after 60 s.');
    }, 60_000);

    const onMessage = async (e: MessageEvent) => {
      if (e.source !== iframe.contentWindow) return;
      const m = e.data as Msg;
      if (m.type === 'ready') {
        iframe.contentWindow?.postMessage({ type: 'run', code, network: publicNetwork(network) }, '*');
      } else if (m.type === 'log') {
        setLines((l) => (l.length > 500 ? l : [...l, { level: m.level, text: m.text }]));
      } else if (m.type === 'call') {
        let reply: { result?: unknown; error?: string };
        try {
          reply = { result: await handle(network, m.name, m.args) };
        } catch (err) {
          reply = { error: (err as Error).message };
        }
        iframe.contentWindow?.postMessage({ type: 'reply', id: m.id, ...reply }, '*');
      } else if (m.type === 'done' || m.type === 'error') {
        if (m.type === 'error') setLines((l) => [...l, { level: 'error', text: m.text }]);
        else if (m.text !== undefined) setLines((l) => [...l, { level: 'result', text: m.text! }]);
        clearTimeout(timeout);
        window.removeEventListener('message', onMessage);
        // Keep sockets and timers from running on after the code finished.
        stop();
      }
    };
    window.addEventListener('message', onMessage);
    detach.current = () => {
      clearTimeout(timeout);
      window.removeEventListener('message', onMessage);
    };
  }, [code, network, stop]);

  return (
    <Frame
      badge={<Badge tone="primary">JS</Badge>}
      title={title ?? (example ? EXAMPLES[example].title : 'Run it')}
      right={
        <>
          <NetworkPicker />
          {code !== source && (
            <button onClick={() => setCode(source)} className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-fd-muted-foreground hover:bg-fd-accent hover:text-fd-foreground">
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </button>
          )}
          <CopyButton text={code} />
          <RunButton running={running} onRun={run} onStop={() => stop('Stopped.')} />
        </>
      }
    >
      <div className="border-b border-fd-border">
        <CodeEditor value={code} onChange={setCode} language="javascript" onRun={run} minHeight={height} />
      </div>
      <div ref={host} />
      <div className="min-h-[2.5rem] bg-fd-background/40">
        <div className="flex items-center justify-between px-3 pt-2 text-[11px] uppercase tracking-wide text-fd-muted-foreground">
          <span>output</span>
          <span className="normal-case tracking-normal">{elapsed !== null ? `${elapsed} ms` : running ? 'running…' : '⌘/Ctrl + Enter to run'}</span>
        </div>
        <div className="max-h-[420px] overflow-auto px-3 pb-3 pt-1 font-mono text-[12px] leading-relaxed">
          {lines.length === 0 && !running && <div className="text-fd-muted-foreground">Edit the code and run it. It talks to {network.label.toLowerCase()} from your browser.</div>}
          {lines.map((l, i) => (
            <pre
              key={i}
              className={cn(
                'whitespace-pre-wrap break-words',
                l.level === 'error' && 'text-ask',
                l.level === 'warn' && 'text-warn',
                l.level === 'info' && 'text-fd-muted-foreground',
                l.level === 'result' && 'text-fd-primary'
              )}
            >
              {l.level === 'result' ? `← ${l.text}` : l.text}
            </pre>
          ))}
        </div>
      </div>
    </Frame>
  );
}

interface Line {
  level: 'log' | 'info' | 'warn' | 'error' | 'result';
  text: string;
}

type Msg =
  | { type: 'ready' }
  | { type: 'log'; level: Line['level']; text: string }
  | { type: 'call'; id: number; name: string; args: unknown[] }
  | { type: 'done'; text?: string }
  | { type: 'error'; text: string };

const publicNetwork = (n: DocsNetwork) => ({ id: n.id, node: n.node, rpc: n.rpc, ws: n.ws, trade: n.trade, profiles: n.profiles, explorer: n.explorer });

/** The page side of the runner's helpers. */
async function handle(net: DocsNetwork, name: string, args: unknown[]): Promise<unknown> {
  switch (name) {
    case 'rpc': {
      const [method, params] = args as [string, unknown[]];
      const r = await rpcRequest(net, method, params);
      if (r.error) throw new Error(r.error);
      const body = r.body as { result?: unknown; error?: { code: number; message: string } };
      if (body?.error) throw new Error(`RPC ${body.error.code}: ${body.error.message}`);
      return body?.result;
    }
    case 'rest': {
      const [path, query] = args as [string, Record<string, string>];
      const r = await restRequest(net, 'node', path, query);
      if (r.error) throw new Error(r.error);
      const body = r.body as { ok?: boolean; result?: unknown; error?: string };
      if (body && typeof body === 'object' && 'ok' in body) {
        if (!body.ok) throw new Error(`${path}: ${body.error}`);
        return body.result;
      }
      if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
      return body;
    }
    case 'trade': {
      const [path] = args as [string];
      const r = await restRequest(net, 'trade', path);
      if (r.error) throw new Error(r.error);
      if (!r.ok) throw new Error(`trade ${path}: HTTP ${r.status} ${JSON.stringify((r.body as { error?: unknown })?.error ?? '')}`);
      return r.body;
    }
    case 'pq.keygen':
      return pq.keygen(args[0] as string | undefined);
    case 'pq.sign':
      return pq.sign(args[0] as string, args[1] as string, (args[2] as { raw?: boolean }) ?? {});
    case 'pq.verify':
      return pq.verify(args[0] as string, args[1] as string, args[2] as string, (args[3] as { raw?: boolean }) ?? {});
    case 'pq.address':
      return pq.pqAddress(args[0] as string);
    case 'pq.accountId':
      return pq.accountId(args[0] as string);
    case 'hash.keccak256':
      return pq.keccak256(args[0] as string);
    case 'hash.blake2b256':
      return pq.blake2b256(args[0] as string);
    default:
      throw new Error(`unknown helper ${name}`);
  }
}

/** The sandboxed page. It has no network access to the docs origin and no storage; it only talks to the parent. */
const RUNTIME = `<!doctype html><html><body><script>
(() => {
  const pending = new Map(); let seq = 0;
  const send = (m) => parent.postMessage(m, '*');
  const call = (name, args) => new Promise((resolve, reject) => { const id = ++seq; pending.set(id, { resolve, reject }); send({ type: 'call', id, name, args }); });
  const fmt = (v) => {
    if (typeof v === 'string') return v;
    if (v instanceof Error) return v.stack || String(v);
    try {
      return JSON.stringify(v, (k, x) => typeof x === 'bigint' ? x.toString() + 'n' : x instanceof Uint8Array ? '0x' + Array.from(x, (b) => b.toString(16).padStart(2, '0')).join('') : x, 2) ?? String(v);
    } catch { return String(v); }
  };
  const short = (s) => s.length > 20000 ? s.slice(0, 20000) + '\\n… (' + s.length.toLocaleString() + ' characters)' : s;
  for (const level of ['log', 'info', 'warn', 'error', 'debug']) {
    console[level] = (...a) => send({ type: 'log', level: level === 'debug' ? 'log' : level, text: short(a.map(fmt).join(' ')) });
  }
  console.table = (rows) => {
    if (!Array.isArray(rows) || !rows.length) return console.log(rows);
    const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))];
    const cell = (v) => v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
    const w = cols.map((c) => Math.min(42, Math.max(c.length, ...rows.map((r) => cell(r[c]).length))));
    const line = (vals) => vals.map((v, i) => cell(v).slice(0, 42).padEnd(w[i])).join('  ');
    send({ type: 'log', level: 'log', text: [line(cols), w.map((n) => '─'.repeat(n)).join('  '), ...rows.map((r) => line(cols.map((c) => r[c])))].join('\\n') });
  };
  addEventListener('message', async (e) => {
    const m = e.data;
    if (!m || typeof m !== 'object') return;
    if (m.type === 'reply') {
      const p = pending.get(m.id); if (!p) return; pending.delete(m.id);
      return m.error !== undefined ? p.reject(new Error(m.error)) : p.resolve(m.result);
    }
    if (m.type !== 'run') return;
    const rpc = (method, ...params) => call('rpc', [method, params]);
    const rest = (path, query) => call('rest', [path, query || {}]);
    const trade = (path) => call('trade', [path]);
    const pq = {
      keygen: (seed) => call('pq.keygen', [seed]),
      sign: (message, secretKey, opts) => call('pq.sign', [message, secretKey, opts || {}]),
      verify: (message, signature, publicKey, opts) => call('pq.verify', [message, signature, publicKey, opts || {}]),
      address: (publicKey) => call('pq.address', [publicKey]),
      accountId: (address) => call('pq.accountId', [address]),
    };
    const hash = { keccak256: (x) => call('hash.keccak256', [x]), blake2b256: (x) => call('hash.blake2b256', [x]) };
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    try {
      const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
      const fn = new AsyncFunction('rpc', 'rest', 'trade', 'pq', 'hash', 'network', 'sleep', m.code);
      const out = await fn(rpc, rest, trade, pq, hash, m.network, sleep);
      send({ type: 'done', text: out === undefined ? undefined : short(fmt(out)) });
    } catch (err) {
      send({ type: 'error', text: short(err && err.stack ? String(err.message || err) : String(err)) });
    }
  });
  send({ type: 'ready' });
})();
</script></body></html>`;
