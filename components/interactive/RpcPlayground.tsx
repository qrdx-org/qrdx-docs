'use client';

import { useCallback, useEffect, useState } from 'react';
import { CodeEditor } from './editor';
import { NetworkPicker, rpcRequest, useNetwork, type CallResult } from './network';
import { Badge, CopyButton, Frame, JsonView, RunButton, Status } from './ui';

/**
 * A JSON-RPC call against the chosen network, with editable params.
 *
 *   <RpcPlayground method="market_getTicker" params={["QRDX:0x…"]} />
 */
export function RpcPlayground({ method: initialMethod, params = [], note, autoRun = false, editable = false }: { method: string; params?: unknown[]; note?: string; autoRun?: boolean; editable?: boolean }) {
  const [method, setMethod] = useState(initialMethod);
  const { network } = useNetwork();
  const [text, setText] = useState(() => JSON.stringify(params, null, 2));
  const [res, setRes] = useState<CallResult | null>(null);
  const [running, setRunning] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  const run = useCallback(async () => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      setParseError(`Params are not valid JSON: ${(e as Error).message}`);
      return;
    }
    setParseError(null);
    setRunning(true);
    setRes(await rpcRequest(network, method, parsed));
    setRunning(false);
  }, [network, method, text]);

  // Re-run when the reader switches network, if it ran (or auto-runs) already.
  useEffect(() => {
    if (autoRun || res) void run();
  }, [network.rpc]); // eslint-disable-line react-hooks/exhaustive-deps

  const body = JSON.stringify({ jsonrpc: '2.0', id: 1, method, params: safeParse(text) });
  const curl = `curl -s ${network.rpc} \\\n  -H 'content-type: application/json' \\\n  -d '${body.replace(/'/g, "'\\''")}'`;
  const rpcError = res && typeof res.body === 'object' && res.body && 'error' in (res.body as object) ? (res.body as { error: { message?: string } }).error : null;

  return (
    <Frame
      badge={<Badge tone="primary">RPC</Badge>}
      title={
        editable ? (
          <input
            value={method}
            onChange={(e) => setMethod(e.target.value.trim())}
            onKeyDown={(e) => e.key === 'Enter' && run()}
            spellCheck={false}
            aria-label="Method"
            className="w-full min-w-0 rounded-md border border-fd-border bg-fd-background px-2 py-0.5 font-mono text-[12.5px] outline-none focus:border-fd-primary"
          />
        ) : (
          method
        )
      }
      right={
        <>
          <NetworkPicker />
          <CopyButton text={curl} label="curl" />
          <RunButton running={running} onRun={run} />
        </>
      }
    >
      <div className="border-b border-fd-border">
        <div className="flex items-center justify-between px-3 pt-2 text-[11px] uppercase tracking-wide text-fd-muted-foreground">
          <span>params</span>
          <span className="normal-case tracking-normal">⌘/Ctrl + Enter to run</span>
        </div>
        <CodeEditor value={text} onChange={setText} language="json" onRun={run} />
      </div>
      {note && <p className="border-b border-fd-border px-3 py-2 text-xs text-fd-muted-foreground">{note}</p>}
      {parseError && <p className="px-3 py-2 text-xs text-ask">{parseError}</p>}
      {res ? (
        <div>
          <div className="flex items-center justify-between px-3 pt-2">
            <span className="text-[11px] uppercase tracking-wide text-fd-muted-foreground">response</span>
            <Status ok={res.ok && !rpcError} status={res.status} ms={res.ms} note={rpcError ? `RPC error ${(rpcError as { code?: number }).code ?? ''}` : undefined} />
          </div>
          {res.error ? <p className="px-3 py-3 text-xs text-ask">{res.error}</p> : <JsonView value={res.body} />}
        </div>
      ) : (
        <p className="px-3 py-3 text-xs text-fd-muted-foreground">
          Run sends this request from your browser to <span className="font-mono">{network.rpc}</span>.
        </p>
      )}
    </Frame>
  );
}

function safeParse(t: string): unknown {
  try {
    return JSON.parse(t);
  } catch {
    return [];
  }
}
