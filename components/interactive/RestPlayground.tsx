'use client';

import { useCallback, useEffect, useState } from 'react';
import { NetworkPicker, queryString, restRequest, useNetwork, type CallResult, type RestApi } from './network';
import { Badge, CopyButton, Frame, JsonView, RunButton, Status } from './ui';

/**
 * A GET against the node's REST API or trade.qrdx.org's, with editable query
 * parameters.
 *
 *   <RestPlayground path="/get_ticker" query={{ market: "…" }} />
 *   <RestPlayground api="trade" path="/markets" />
 */
export function RestPlayground({
  path,
  query = {},
  api = 'node',
  note,
  autoRun = false,
}: {
  path: string;
  query?: Record<string, string>;
  api?: RestApi;
  note?: string;
  autoRun?: boolean;
}) {
  const { network } = useNetwork();
  const [values, setValues] = useState<Record<string, string>>(query);
  const [res, setRes] = useState<CallResult | null>(null);
  const [running, setRunning] = useState(false);

  const run = useCallback(async () => {
    setRunning(true);
    setRes(await restRequest(network, api, path, values));
    setRunning(false);
  }, [network, api, path, values]);

  useEffect(() => {
    if (autoRun || res) void run();
  }, [network.node, network.trade, network.profiles]); // eslint-disable-line react-hooks/exhaustive-deps

  const base = api === 'trade' ? network.trade : api === 'profiles' ? network.profiles : network.node;
  const url = `${base}${path}${queryString(values)}`;
  const envelopeError = res && typeof res.body === 'object' && res.body && (res.body as { ok?: boolean }).ok === false ? (res.body as { error?: string }).error : null;

  return (
    <Frame
      badge={<Badge tone={api === 'node' ? 'bid' : 'warn'}>{api === 'node' ? 'GET' : api.toUpperCase()}</Badge>}
      title={path}
      right={
        <>
          <NetworkPicker />
          <CopyButton text={`curl -s '${url}'`} label="curl" />
          <RunButton running={running} onRun={run} />
        </>
      }
    >
      {Object.keys(values).length > 0 && (
        <div className="grid gap-x-3 gap-y-1.5 border-b border-fd-border px-3 py-2.5 sm:grid-cols-[auto_1fr]">
          {Object.keys(values).map((k) => (
            <label key={k} className="contents">
              <span className="self-center font-mono text-xs text-fd-muted-foreground">{k}</span>
              <input
                value={values[k]}
                onChange={(e) => setValues((v) => ({ ...v, [k]: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && run()}
                spellCheck={false}
                className="min-w-0 rounded-md border border-fd-border bg-fd-background px-2 py-1 font-mono text-xs outline-none focus:border-fd-primary"
              />
            </label>
          ))}
        </div>
      )}
      <div className="truncate border-b border-fd-border bg-fd-muted/30 px-3 py-1.5 font-mono text-[11px] text-fd-muted-foreground" title={url}>
        {url}
      </div>
      {note && <p className="border-b border-fd-border px-3 py-2 text-xs text-fd-muted-foreground">{note}</p>}
      {res ? (
        <div>
          <div className="flex items-center justify-between px-3 pt-2">
            <span className="text-[11px] uppercase tracking-wide text-fd-muted-foreground">response</span>
            <Status ok={res.ok && !envelopeError} status={res.status} ms={res.ms} note={envelopeError ?? undefined} />
          </div>
          {res.error ? <p className="px-3 py-3 text-xs text-ask">{res.error}</p> : <JsonView value={res.body} />}
        </div>
      ) : (
        <p className="px-3 py-3 text-xs text-fd-muted-foreground">Run sends this request from your browser.</p>
      )}
    </Frame>
  );
}
