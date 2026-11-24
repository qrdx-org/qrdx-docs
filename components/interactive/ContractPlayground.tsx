'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ExternalLink, FileCode2, Loader2, Play, Plug, Rocket, ShieldCheck } from 'lucide-react';
import {
  decodeEventLog,
  decodeFunctionResult,
  encodeDeployData,
  encodeFunctionData,
  type Abi,
  type AbiFunction,
  type AbiParameter,
  type Hex,
} from 'viem';
import { CodeEditor } from './editor';
import { NetworkPicker, rpcRequest, useNetwork, type DocsNetwork } from './network';
import { compileSolidity, EVM_VERSION, MAX_CODE_SIZE, SOLC_VERSION, type CompileResult } from './solc';
import { TEMPLATES } from './contracts';
import { connectQrdx, findQrdxWallet, switchChain, walletChainId, walletError, type Eip1193, type QrdxAccount } from './wallet';
import { apps } from '@/lib/shared';

type Signer = 'pq' | 'classic';

interface Deployed {
  address: Hex;
  name: string;
  abi: Abi;
  hash: Hex;
  signer: Signer;
}

const json = (v: unknown) => JSON.stringify(v, (_, x) => (typeof x === 'bigint' ? x.toString() : x), 2);

/** A form field's text as the value an ABI parameter expects. */
function parseArg(p: AbiParameter, text: string): unknown {
  const t = text.trim();
  const base = p.type.replace(/\[\d*\]$/, '');
  const one = (v: unknown): unknown => (/^u?int\d*$/.test(base) ? BigInt(String(v)) : base === 'bool' ? v === true || v === 'true' || v === '1' : v);
  if (p.type.endsWith(']')) {
    const arr = JSON.parse(t) as unknown[];
    if (!Array.isArray(arr)) throw new Error(`${p.name || p.type}: expected a JSON array`);
    return arr.map(one);
  }
  if (p.type.startsWith('tuple')) return JSON.parse(t);
  if (/^u?int\d*$/.test(p.type) && !/^-?\d+$/.test(t)) throw new Error(`${p.name || p.type}: expected a whole number`);
  return one(t);
}

const placeholder = (p: AbiParameter) =>
  p.type.endsWith(']') ? '[…] as JSON' : /^u?int/.test(p.type) ? '0' : p.type === 'bool' ? 'true or false' : p.type === 'address' ? '0x…' : p.type;

async function rpc<T>(net: DocsNetwork, method: string, params: unknown[]): Promise<T> {
  const r = await rpcRequest(net, method, params);
  const body = r.body as { result?: T; error?: { message?: string } } | null;
  if (r.error) throw new Error(r.error);
  if (body?.error) throw new Error(body.error.message ?? `${method} failed`);
  return body?.result as T;
}

interface Receipt {
  status: string;
  contractAddress: Hex | null;
  gasUsed: string;
  blockNumber: string;
  logs: { address: Hex; data: Hex; topics: [Hex, ...Hex[]] }[];
}

async function waitForReceipt(net: DocsNetwork, hash: string): Promise<Receipt> {
  for (let i = 0; i < 90; i++) {
    const r = await rpc<Receipt | null>(net, 'eth_getTransactionReceipt', [hash]).catch(() => null);
    if (r) return r;
    await new Promise((ok) => setTimeout(ok, 1000));
  }
  throw new Error('No receipt after 90 seconds. The transaction may still land: look it up in the explorer.');
}

function storageKey(net: DocsNetwork) {
  return `qrdx-docs:contracts:${net.id === 'custom' ? net.node : net.id}`;
}

/**
 * Solidity on QRDX, start to finish in the page: write a contract, compile it in the browser
 * (solc, Shanghai), deploy it to the chosen network through QRDX Wallet, signed post-quantum
 * (type 0x51) or with the classic key, then call it. Reads go straight to the node; anything that
 * writes is approved in the wallet. Deployments are remembered in this browser, per network.
 */
export function ContractPlayground({ template = 'counter' }: { template?: string }) {
  const { network } = useNetwork();
  const [templateId, setTemplateId] = useState(template);
  const [source, setSource] = useState(() => (TEMPLATES.find((t) => t.id === template) ?? TEMPLATES[0]).source);
  const [compiling, setCompiling] = useState(false);
  const [compiled, setCompiled] = useState<CompileResult | null>(null);
  const [compileError, setCompileError] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);

  const [wallet, setWallet] = useState<Eip1193 | null | 'missing'>(null);
  const [account, setAccount] = useState<QrdxAccount | null>(null);
  const [walletChain, setWalletChain] = useState<number | null>(null);
  const [netChain, setNetChain] = useState<number | null>(null);
  const [signer, setSigner] = useState<Signer>('pq');
  const [ctorArgs, setCtorArgs] = useState<string[]>([]);
  const [deploy, setDeploy] = useState<{ phase: 'wallet' | 'pending' | 'error'; text: string; hash?: string } | null>(null);
  const [deployed, setDeployed] = useState<Deployed[]>([]);
  const [atAddress, setAtAddress] = useState('');

  const contract = compiled?.contracts.find((c) => c.name === picked) ?? compiled?.contracts.at(-1) ?? null;
  const ctor = contract?.abi.find((x) => x.type === 'constructor') as { inputs: readonly AbiParameter[] } | undefined;

  // The network's chain id, to match the wallet against.
  useEffect(() => {
    let off = false;
    setNetChain(null);
    rpc<string>(network, 'eth_chainId', [])
      .then((h) => !off && setNetChain(parseInt(h, 16)))
      .catch(() => undefined);
    try {
      setDeployed(JSON.parse(localStorage.getItem(storageKey(network)) ?? '[]'));
    } catch {
      setDeployed([]);
    }
    return () => {
      off = true;
    };
  }, [network]);

  const remember = (list: Deployed[]) => {
    setDeployed(list);
    try {
      localStorage.setItem(storageKey(network), JSON.stringify(list.slice(0, 12)));
    } catch {
      /* this browser only */
    }
  };

  const compile = useCallback(async () => {
    setCompiling(true);
    setCompileError(null);
    try {
      const r = await compileSolidity(source);
      setCompiled(r);
      setPicked((p) => (p && r.contracts.some((c) => c.name === p) ? p : (r.contracts.at(-1)?.name ?? null)));
      setCtorArgs([]);
    } catch (e) {
      setCompileError((e as Error).message);
    } finally {
      setCompiling(false);
    }
  }, [source]);

  const connect = async () => {
    const w = await findQrdxWallet();
    if (!w) return setWallet('missing');
    setWallet(w);
    try {
      setAccount(await connectQrdx(w));
      setWalletChain(await walletChainId(w));
      w.on?.('chainChanged', (id) => setWalletChain(parseInt(String(id), 16)));
      w.on?.('accountsChanged', () => connectQrdx(w).then(setAccount, () => setAccount(null)));
    } catch (e) {
      setDeploy({ phase: 'error', text: walletError(e) });
    }
  };

  const sameChain = walletChain !== null && netChain !== null && walletChain === netChain;
  const from = account ? (signer === 'pq' ? account.pqAccountId : account.address) : undefined;

  /** Signs and sends through the wallet: a deployment without `to`, a call with it. */
  const send = async (tx: { to?: Hex; data: Hex; value?: bigint }) => {
    if (!wallet || wallet === 'missing' || !account) throw new Error('Connect the wallet first.');
    const value = tx.value ? `0x${tx.value.toString(16)}` : undefined;
    return (await (signer === 'pq'
      ? wallet.request({ method: 'qrdx_sendPQTransaction', params: [{ ...(tx.to ? { to: tx.to } : {}), data: tx.data, ...(value ? { value } : {}) }] })
      : wallet.request({ method: 'eth_sendTransaction', params: [{ from: account.address, ...(tx.to ? { to: tx.to } : {}), data: tx.data, ...(value ? { value } : {}) }] }))) as Hex;
  };

  const doDeploy = async () => {
    if (!contract) return;
    let data: Hex;
    try {
      const args = (ctor?.inputs ?? []).map((p, i) => parseArg(p, ctorArgs[i] ?? ''));
      data = encodeDeployData({ abi: contract.abi, bytecode: contract.bytecode, args });
    } catch (e) {
      return setDeploy({ phase: 'error', text: (e as Error).message });
    }
    setDeploy({ phase: 'wallet', text: 'Approve the deployment in QRDX Wallet…' });
    try {
      const hash = await send({ data });
      setDeploy({ phase: 'pending', text: 'Sent. Waiting for its block…', hash });
      const r = await waitForReceipt(network, hash);
      if (r.status !== '0x1' || !r.contractAddress) throw new Error(`The deployment failed on chain (block ${parseInt(r.blockNumber, 16)}).`);
      remember([{ address: r.contractAddress, name: contract.name, abi: contract.abi, hash, signer }, ...deployed]);
      setDeploy(null);
    } catch (e) {
      setDeploy((d) => ({ phase: 'error', text: walletError(e), hash: d?.hash }));
    }
  };

  const loadAt = () => {
    if (!contract || !/^0x[0-9a-fA-F]{40}$/.test(atAddress.trim())) return;
    remember([{ address: atAddress.trim() as Hex, name: contract.name, abi: contract.abi, hash: '0x' as Hex, signer }, ...deployed]);
    setAtAddress('');
  };

  const errors = compiled?.diagnostics.filter((d) => d.severity === 'error') ?? [];

  return (
    <div className="not-prose my-6 overflow-hidden rounded-xl border border-fd-border bg-fd-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-fd-border px-3 py-2 text-xs">
        <span className="inline-flex items-center gap-2 font-medium">
          <FileCode2 className="h-3.5 w-3.5" /> Solidity playground
          <span className="font-normal text-fd-muted-foreground">
            solc {SOLC_VERSION} · EVM {EVM_VERSION}
          </span>
        </span>
        <span className="flex items-center gap-2">
          <select
            aria-label="Template"
            value={templateId}
            onChange={(e) => {
              const t = TEMPLATES.find((x) => x.id === e.target.value)!;
              setTemplateId(t.id);
              setSource(t.source);
              setCompiled(null);
            }}
            className="cursor-pointer rounded-md border border-fd-border bg-fd-background px-1.5 py-0.5 text-xs outline-none hover:bg-fd-accent"
          >
            {TEMPLATES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
          <NetworkPicker />
        </span>
      </div>

      <CodeEditor value={source} onChange={setSource} language="solidity" onRun={compile} minHeight="260px" />

      <div className="flex flex-wrap items-center gap-3 border-t border-fd-border px-3 py-2 text-xs">
        <button
          type="button"
          onClick={compile}
          disabled={compiling}
          className="inline-flex items-center gap-1.5 rounded-md bg-fd-primary px-3 py-1.5 font-medium text-fd-primary-foreground hover:opacity-90 disabled:opacity-60"
        >
          {compiling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />} Compile
        </button>
        <span className="text-fd-muted-foreground">
          {compiling
            ? compiled
              ? 'Compiling…'
              : 'Loading the compiler (about 9 MB, once)…'
            : compiled
              ? errors.length
                ? `${errors.length} error${errors.length > 1 ? 's' : ''}`
                : `Compiled in ${(compiled.ms / 1000).toFixed(1)} s`
              : '⌘/Ctrl-Enter compiles, in your browser'}
        </span>
      </div>

      {compileError && <p className="border-t border-fd-border px-3 py-2 text-xs text-ask">{compileError}</p>}
      {compiled && compiled.diagnostics.length > 0 && (
        <ul className="max-h-40 space-y-1 overflow-y-auto border-t border-fd-border px-3 py-2 font-mono text-[11px]">
          {compiled.diagnostics.map((d, i) => (
            <li key={i} className={d.severity === 'error' ? 'text-ask' : d.severity === 'warning' ? 'text-warn' : 'text-fd-muted-foreground'}>
              {d.line ? `line ${d.line}: ` : ''}
              {d.message}
            </li>
          ))}
        </ul>
      )}

      {contract && !errors.length && (
        <div className="space-y-4 border-t border-fd-border p-3">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            {compiled!.contracts.length > 1 && (
              <select
                aria-label="Contract"
                value={contract.name}
                onChange={(e) => (setPicked(e.target.value), setCtorArgs([]))}
                className="rounded-md border border-fd-border bg-fd-background px-1.5 py-0.5"
              >
                {compiled!.contracts.map((c) => (
                  <option key={c.name}>{c.name}</option>
                ))}
              </select>
            )}
            <span className="font-medium">{contract.name}</span>
            <span className="flex min-w-40 flex-1 items-center gap-2 text-fd-muted-foreground">
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-fd-muted">
                <span className="block h-full bg-fd-foreground/70" style={{ width: `${Math.min(100, (contract.runtimeSize / MAX_CODE_SIZE) * 100)}%` }} />
              </span>
              <span className="num">
                {contract.runtimeSize.toLocaleString()} of {MAX_CODE_SIZE.toLocaleString()} bytes of code
              </span>
            </span>
          </div>
          <details className="text-xs">
            <summary className="cursor-pointer text-fd-muted-foreground">ABI and bytecode</summary>
            <pre className="mt-2 max-h-56 overflow-auto rounded-md bg-fd-muted/50 p-2 text-[11px]">{json(contract.abi)}</pre>
            <pre className="mt-2 max-h-24 overflow-auto break-all whitespace-pre-wrap rounded-md bg-fd-muted/50 p-2 text-[11px]">{contract.bytecode}</pre>
          </details>

          <div className="rounded-lg border border-fd-border p-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 font-medium">
                <Rocket className="h-3.5 w-3.5" /> Deploy to {network.label}
              </span>
              {!account ? (
                <button type="button" onClick={connect} className="inline-flex items-center gap-1.5 rounded-md border border-fd-border px-2.5 py-1 hover:bg-fd-accent">
                  <Plug className="h-3.5 w-3.5" /> Connect QRDX Wallet
                </button>
              ) : (
                <span className="font-mono text-[11px] text-fd-muted-foreground">{signer === 'pq' ? account.pqAddress.slice(0, 14) : account.address.slice(0, 10)}…</span>
              )}
            </div>
            {wallet === 'missing' && (
              <p className="mb-2 text-xs text-fd-muted-foreground">
                QRDX Wallet is not in this browser. Install the{' '}
                <a href={apps.wallet} target="_blank" rel="noopener noreferrer" className="underline">
                  browser extension
                </a>{' '}
                and reload this page.
              </p>
            )}
            {account && !sameChain && netChain !== null && (
              <p className="mb-2 flex flex-wrap items-center gap-2 text-xs text-warn">
                The wallet is on another network (chain {walletChain ?? '?'}); this page is on {network.label} (chain {netChain}).
                <button type="button" onClick={() => wallet && wallet !== 'missing' && switchChain(wallet, netChain).catch((e) => setDeploy({ phase: 'error', text: walletError(e) }))} className="rounded-md border border-fd-border px-2 py-0.5 text-fd-foreground hover:bg-fd-accent">
                  Switch the wallet
                </button>
              </p>
            )}
            <div className="mb-3 inline-flex rounded-md border border-fd-border p-0.5 text-xs">
              {(
                [
                  ['pq', 'Post-quantum (0x51)'],
                  ['classic', 'Classic key'],
                ] as const
              ).map(([k, label]) => (
                <button key={k} type="button" onClick={() => setSigner(k)} className={`rounded px-2.5 py-1 ${signer === k ? 'bg-fd-primary text-fd-primary-foreground' : 'text-fd-muted-foreground hover:text-fd-foreground'}`}>
                  {label}
                </button>
              ))}
            </div>
            <p className="mb-3 text-[11px] leading-relaxed text-fd-muted-foreground">
              {signer === 'pq'
                ? "Signed with the account's ML-DSA-65 key. The contract's msg.sender is the account's 20-byte ID" + (account ? ` (${account.pqAccountId.slice(0, 10)}…)` : '') + '.'
                : "Signed with the account's secp256k1 key, as on Ethereum. msg.sender is its 0x address."}
            </p>
            {(ctor?.inputs ?? []).length > 0 && (
              <div className="mb-3 grid gap-2 sm:grid-cols-2">
                {ctor!.inputs.map((p, i) => (
                  <label key={i} className="text-[11px] text-fd-muted-foreground">
                    {p.name || `arg ${i}`} <span className="font-mono">{p.type}</span>
                    <input
                      value={ctorArgs[i] ?? ''}
                      placeholder={placeholder(p)}
                      onChange={(e) => setCtorArgs((a) => Object.assign([...a], { [i]: e.target.value }))}
                      className="mt-0.5 w-full rounded-md border border-fd-border bg-fd-background px-2 py-1 font-mono text-xs text-fd-foreground outline-none"
                    />
                  </label>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={doDeploy}
              disabled={!account || !sameChain || deploy?.phase === 'wallet' || deploy?.phase === 'pending'}
              className="inline-flex items-center gap-1.5 rounded-md bg-fd-primary px-3 py-1.5 text-xs font-medium text-fd-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {deploy?.phase === 'wallet' || deploy?.phase === 'pending' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Rocket className="h-3.5 w-3.5" />} Deploy
            </button>
            {deploy && (
              <p className={`mt-2 text-xs ${deploy.phase === 'error' ? 'text-ask' : 'text-fd-muted-foreground'}`}>
                {deploy.text}{' '}
                {deploy.hash && (
                  <a href={`${network.explorer}/tx/${deploy.hash}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 underline">
                    transaction <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </p>
            )}
            <div className="mt-3 flex gap-2 text-xs">
              <input
                value={atAddress}
                onChange={(e) => setAtAddress(e.target.value)}
                placeholder={`Or use ${contract.name} at an address: 0x…`}
                className="min-w-0 flex-1 rounded-md border border-fd-border bg-fd-background px-2 py-1 font-mono text-xs outline-none"
              />
              <button type="button" onClick={loadAt} className="rounded-md border border-fd-border px-2.5 py-1 hover:bg-fd-accent">
                Load
              </button>
            </div>
          </div>
        </div>
      )}

      {deployed.length > 0 && (
        <div className="space-y-3 border-t border-fd-border p-3">
          {deployed.map((d, i) => (
            <Instance key={`${d.address}-${i}`} d={d} network={network} from={from} send={account ? send : null} onForget={() => remember(deployed.filter((_, j) => j !== i))} />
          ))}
        </div>
      )}
    </div>
  );
}

/** A deployed contract: every function as a form; reads call the node, writes go through the wallet. */
function Instance({
  d,
  network,
  from,
  send,
  onForget,
}: {
  d: Deployed;
  network: DocsNetwork;
  from: Hex | undefined;
  send: ((tx: { to?: Hex; data: Hex; value?: bigint }) => Promise<Hex>) | null;
  onForget: () => void;
}) {
  const fns = useMemo(() => d.abi.filter((x): x is AbiFunction => x.type === 'function'), [d.abi]);
  return (
    <div className="rounded-lg border border-fd-border">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-fd-border px-3 py-2 text-xs">
        <span className="inline-flex items-center gap-2">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span className="font-medium">{d.name}</span>
          <a href={`${network.explorer}/address/${d.address}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 font-mono text-[11px] text-fd-muted-foreground underline">
            {d.address.slice(0, 10)}…{d.address.slice(-6)} <ExternalLink className="h-3 w-3" />
          </a>
          <span className="text-[10.5px] text-fd-muted-foreground">{d.signer === 'pq' ? 'deployed post-quantum' : 'deployed with the classic key'}</span>
        </span>
        <button type="button" onClick={onForget} className="text-[11px] text-fd-muted-foreground hover:text-fd-foreground">
          Forget
        </button>
      </div>
      <div className="divide-y divide-fd-border">
        {fns.map((f, i) => (
          <Fn key={`${f.name}-${i}`} f={f} d={d} network={network} from={from} send={send} />
        ))}
      </div>
    </div>
  );
}

function Fn({
  f,
  d,
  network,
  from,
  send,
}: {
  f: AbiFunction;
  d: Deployed;
  network: DocsNetwork;
  from: Hex | undefined;
  send: ((tx: { to?: Hex; data: Hex; value?: bigint }) => Promise<Hex>) | null;
}) {
  const read = f.stateMutability === 'view' || f.stateMutability === 'pure';
  const [args, setArgs] = useState<string[]>([]);
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<{ ok: boolean; text: string; hash?: string } | null>(null);

  const run = async () => {
    setBusy(true);
    setOut(null);
    try {
      const data = encodeFunctionData({ abi: d.abi, functionName: f.name, args: f.inputs.map((p, i) => parseArg(p, args[i] ?? '')) });
      if (read) {
        const raw = await rpc<Hex>(network, 'eth_call', [{ ...(from ? { from } : {}), to: d.address, data }, 'latest']);
        const result = decodeFunctionResult({ abi: d.abi, functionName: f.name, data: raw });
        setOut({ ok: true, text: typeof result === 'object' ? json(result) : String(result) });
      } else {
        if (!send) throw new Error('Connect the wallet to send.');
        const hash = await send({ to: d.address, data, value: value ? BigInt(value) : undefined });
        setOut({ ok: true, text: 'Sent. Waiting for its block…', hash });
        const r = await waitForReceipt(network, hash);
        const events = r.logs
          .filter((l) => l.address.toLowerCase() === d.address.toLowerCase())
          .map((l) => {
            try {
              const e = decodeEventLog({ abi: d.abi, data: l.data, topics: l.topics });
              return `${e.eventName} ${json(e.args)}`;
            } catch {
              return `a log the ABI does not describe (${l.topics[0]?.slice(0, 10)}…)`;
            }
          });
        setOut({
          ok: r.status === '0x1',
          text: `${r.status === '0x1' ? 'Done' : 'Reverted'} in block ${parseInt(r.blockNumber, 16).toLocaleString()}, ${parseInt(r.gasUsed, 16).toLocaleString()} gas.${events.length ? `\n${events.join('\n')}` : ''}`,
          hash,
        });
      }
    } catch (e) {
      setOut({ ok: false, text: walletError(e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="px-3 py-2 text-xs">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={run}
          disabled={busy || (!read && !send)}
          title={!read && !send ? 'Connect the wallet to send' : undefined}
          className={`inline-flex min-w-24 items-center justify-center gap-1 rounded-md px-2.5 py-1 font-mono disabled:opacity-50 ${read ? 'border border-fd-border hover:bg-fd-accent' : 'bg-fd-primary text-fd-primary-foreground hover:opacity-90'}`}
        >
          {busy && <Loader2 className="h-3 w-3 animate-spin" />}
          {f.name}
        </button>
        {f.inputs.map((p, i) => (
          <input
            key={i}
            value={args[i] ?? ''}
            onChange={(e) => setArgs((a) => Object.assign([...a], { [i]: e.target.value }))}
            placeholder={`${p.name || `arg ${i}`}: ${placeholder(p)}`}
            className="min-w-32 flex-1 rounded-md border border-fd-border bg-fd-background px-2 py-1 font-mono text-xs outline-none"
          />
        ))}
        {f.stateMutability === 'payable' && (
          <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="value, wei" className="w-28 rounded-md border border-fd-border bg-fd-background px-2 py-1 font-mono text-xs outline-none" />
        )}
        <span className="text-[10.5px] text-fd-muted-foreground">{read ? 'read' : 'write: approve in the wallet'}</span>
      </div>
      {out && (
        <pre className={`mt-1.5 whitespace-pre-wrap break-all rounded-md bg-fd-muted/50 px-2 py-1 text-[11px] ${out.ok ? '' : 'text-ask'}`}>
          {out.text}
          {out.hash && (
            <>
              {' '}
              <a href={`${network.explorer}/tx/${out.hash}`} target="_blank" rel="noopener noreferrer" className="underline">
                transaction
              </a>
            </>
          )}
        </pre>
      )}
    </div>
  );
}
