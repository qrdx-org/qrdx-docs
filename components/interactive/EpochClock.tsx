'use client';

import { useEffect, useRef, useState } from 'react';
import { Timer } from 'lucide-react';
import { NetworkPicker, restRequest, useNetwork } from './network';
import { useBlockStream } from './stream';

interface Clock {
  genesisMs: number;
  slotMs: number;
  slotsPerEpoch: number;
}

/** How many epochs the rail shows, back from the current one. */
const RAIL = 12;

/**
 * Proof of stake, ticking: the chosen network's slot clock (slot n starts at genesis + n × the slot
 * length, from `/chain_spec` and the genesis block), the current epoch's slots filling in, a dot
 * in each slot during which a block arrived here from the stream, and the epochs behind it, solid
 * once finalized. The gap between the current epoch and the finalized one is finality's lag.
 */
export function EpochClock() {
  const { network } = useNetwork();
  const [clock, setClock] = useState<Clock | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [finalized, setFinalized] = useState<number | null>(null);
  const arrivals = useRef(new Map<number, number>());

  useEffect(() => {
    let off = false;
    setClock(null);
    setError(null);
    arrivals.current.clear();
    (async () => {
      const [spec, genesis] = await Promise.all([restRequest(network, 'node', '/chain_spec'), restRequest(network, 'node', '/get_block', { block: '0' })]);
      const p = (spec.body as { params?: Record<string, number> } | null)?.params;
      const ts = (genesis.body as { result?: { block?: { timestamp?: string | number } } } | null)?.result?.block?.timestamp;
      const genesisMs = typeof ts === 'number' ? ts * 1000 : ts ? Date.parse(String(ts).replace(' ', 'T')) : NaN;
      if (off) return;
      if (!p?.SLOT_DURATION_MS || !p.SLOTS_PER_EPOCH || !Number.isFinite(genesisMs)) {
        setError(spec.error ?? genesis.error ?? `${network.label} did not report its chain spec and genesis.`);
        return;
      }
      setClock({ genesisMs, slotMs: p.SLOT_DURATION_MS, slotsPerEpoch: p.SLOTS_PER_EPOCH });
    })();
    return () => {
      off = true;
    };
  }, [network]);

  useEffect(() => {
    if (!clock) return;
    const t = setInterval(() => setNow(Date.now()), Math.min(clock.slotMs, 250));
    return () => clearInterval(t);
  }, [clock]);

  const connected = useBlockStream(network, (b) => {
    if (b.finalizedEpoch !== null) setFinalized(b.finalizedEpoch);
    if (!clock) return;
    const slot = Math.floor((Date.now() - clock.genesisMs) / clock.slotMs);
    arrivals.current.set(slot, (arrivals.current.get(slot) ?? 0) + 1);
    if (arrivals.current.size > 512) arrivals.current.delete(arrivals.current.keys().next().value!);
  });

  const slot = clock ? Math.floor((now - clock.genesisMs) / clock.slotMs) : null;
  const epoch = clock && slot !== null ? Math.floor(slot / clock.slotsPerEpoch) : null;
  const first = clock && epoch !== null ? epoch * clock.slotsPerEpoch : 0;
  const inEpoch = clock && slot !== null ? slot - first : 0;
  const blocks = clock ? Array.from({ length: clock.slotsPerEpoch }, (_, i) => arrivals.current.get(first + i) ?? 0) : [];
  const lag = epoch !== null && finalized !== null ? epoch - finalized : null;
  const epochSeconds = clock ? (clock.slotMs * clock.slotsPerEpoch) / 1000 : 0;

  return (
    <div className="not-prose my-6 overflow-hidden rounded-xl border border-fd-border bg-fd-card">
      <div className="flex items-center justify-between border-b border-fd-border px-3 py-2 text-xs">
        <span className="inline-flex items-center gap-2 font-medium">
          <Timer className="h-3.5 w-3.5" /> {network.label}: slots and epochs, live
          <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'animate-pulse bg-bid' : 'bg-fd-muted-foreground'}`} title={connected ? 'streaming' : 'not streaming'} />
        </span>
        <NetworkPicker />
      </div>
      {error ? (
        <p className="px-3 py-3 text-xs text-ask">{error}</p>
      ) : !clock || slot === null || epoch === null ? (
        <p className="px-3 py-3 text-xs text-fd-muted-foreground">Reading the chain spec…</p>
      ) : (
        <div className="space-y-5 p-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ['Slot', slot.toLocaleString(), `${clock.slotMs} ms each`],
              ['Epoch', epoch.toLocaleString(), `${clock.slotsPerEpoch} slots, ${epochSeconds} s`],
              ['Finalized', finalized?.toLocaleString() ?? '—', lag !== null ? `${lag} epoch${lag === 1 ? '' : 's'} behind, ${(lag * epochSeconds).toFixed(0)} s` : 'from the stream'],
              ['Blocks this epoch', blocks.reduce((n, b) => n + (b ? 1 : 0), 0).toString(), `of ${inEpoch + 1} slots so far`],
            ].map(([k, v, hint]) => (
              <div key={k}>
                <div className="text-[11px] text-fd-muted-foreground">{k}</div>
                <div className="num text-lg font-semibold tracking-tight">{v}</div>
                <div className="text-[10.5px] text-fd-muted-foreground">{hint}</div>
              </div>
            ))}
          </div>

          <div>
            <div className="mb-1.5 flex justify-between font-mono text-[10.5px] text-fd-muted-foreground">
              <span>epoch {epoch.toLocaleString()}</span>
              <span>slot {inEpoch + 1} of {clock.slotsPerEpoch}</span>
            </div>
            <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${clock.slotsPerEpoch}, minmax(0, 1fr))` }}>
              {blocks.map((b, i) => (
                <div
                  key={i}
                  title={`slot ${(first + i).toLocaleString()}${i < inEpoch ? (b ? ': a block arrived' : ': no block arrived here') : i === inEpoch ? ': now' : ''}`}
                  className={`relative aspect-square rounded-[3px] border transition-colors duration-200 ${
                    i < inEpoch ? 'border-fd-foreground/25' : i === inEpoch ? 'border-fd-foreground bg-fd-foreground/15' : 'border-fd-foreground/8'
                  }`}
                >
                  {b > 0 && <span className="absolute inset-[22%] rounded-full bg-fd-foreground" />}
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex justify-between font-mono text-[10.5px] text-fd-muted-foreground">
              <span>the last {RAIL} epochs</span>
              <span>solid: finalized · hollow: waiting for two-thirds of the weight</span>
            </div>
            <div className="flex gap-1">
              {Array.from({ length: RAIL }, (_, k) => epoch - (RAIL - 1) + k).map((e) => {
                const done = finalized !== null && e <= finalized;
                const current = e === epoch;
                return (
                  <div key={e} title={`epoch ${e.toLocaleString()}${done ? ': finalized' : current ? ': in progress' : ': not finalized yet'}`} className="h-6 flex-1 overflow-hidden rounded-[3px] border border-fd-foreground/25">
                    <div
                      className={`h-full ${done ? 'bg-fd-foreground/80' : 'bg-fd-foreground/15'}`}
                      style={{ width: current ? `${((inEpoch + 1) / clock.slotsPerEpoch) * 100}%` : '100%' }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
          <p className="text-[11px] leading-relaxed text-fd-muted-foreground">
            Slots come from the chain spec and the genesis block&apos;s time on your clock; a dot marks a slot during which a block reached this page from the stream.
          </p>
        </div>
      )}
    </div>
  );
}
