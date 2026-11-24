'use client';

/**
 * Solidity, compiled in the reader's browser: the official solc build (soljson, from
 * binaries.soliditylang.org, about 9 MB, cached by the browser) in a Web Worker, so the page stays
 * responsive. QRDX's EVM is Shanghai's (qrdx-node docs/EVM_CONFORMANCE.md): solc 0.8.25 and later
 * default to Cancun, so the EVM version is set.
 */

import type { Abi } from 'viem';

export const SOLC_VERSION = '0.8.30';
const SOLJSON = 'https://binaries.soliditylang.org/bin/soljson-v0.8.30+commit.73712a01.js';
export const EVM_VERSION = 'shanghai';
/** EIP-170: the most code a contract may have. */
export const MAX_CODE_SIZE = 24_576;

export interface CompiledContract {
  name: string;
  abi: Abi;
  bytecode: `0x${string}`;
  /** Bytes of the code the contract keeps once deployed. */
  runtimeSize: number;
}

export interface Diagnostic {
  severity: 'error' | 'warning' | 'info';
  message: string;
  line: number | null;
}

export interface CompileResult {
  contracts: CompiledContract[];
  diagnostics: Diagnostic[];
  ms: number;
}

// The worker loads soljson once and answers each compile with its standard-JSON output.
const WORKER = `
let compile = null
const ready = () => new Promise((resolve, reject) => {
  const t0 = Date.now()
  const poll = () => {
    if (self.Module && (self.Module.calledRun || typeof self.Module._solidity_compile === 'function')) return resolve()
    if (Date.now() - t0 > 60000) return reject(new Error('the compiler did not start'))
    setTimeout(poll, 50)
  }
  poll()
})
self.onmessage = async (e) => {
  const { id, url, input } = e.data
  try {
    if (!compile) {
      importScripts(url)
      await ready()
      compile = self.Module.cwrap('solidity_compile', 'string', ['string', 'number', 'number'])
    }
    self.postMessage({ id, output: compile(input, 0, 0) })
  } catch (err) {
    self.postMessage({ id, error: String((err && err.message) || err) })
  }
}
`;

let worker: Worker | null = null;
let seq = 0;
const pending = new Map<number, { resolve: (s: string) => void; reject: (e: Error) => void }>();

function getWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(URL.createObjectURL(new Blob([WORKER], { type: 'text/javascript' })));
  worker.onmessage = (e: MessageEvent<{ id: number; output?: string; error?: string }>) => {
    const p = pending.get(e.data.id);
    if (!p) return;
    pending.delete(e.data.id);
    if (e.data.error) p.reject(new Error(e.data.error));
    else p.resolve(e.data.output!);
  };
  worker.onerror = (e) => {
    for (const p of pending.values()) p.reject(new Error(e.message || 'the compiler failed to load'));
    pending.clear();
    worker = null;
  };
  return worker;
}

/** Line (1-based) of a character offset in the source. */
const lineAt = (source: string, offset: number) => source.slice(0, offset).split('\n').length;

export async function compileSolidity(source: string, file = 'Contract.sol'): Promise<CompileResult> {
  const t0 = performance.now();
  const input = JSON.stringify({
    language: 'Solidity',
    sources: { [file]: { content: source } },
    settings: {
      evmVersion: EVM_VERSION,
      optimizer: { enabled: true, runs: 200 },
      outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object', 'evm.deployedBytecode.object'] } },
    },
  });
  const id = ++seq;
  const raw = await new Promise<string>((resolve, reject) => {
    pending.set(id, { resolve, reject });
    getWorker().postMessage({ id, url: SOLJSON, input });
  });
  const out = JSON.parse(raw) as {
    errors?: { severity: string; formattedMessage?: string; message: string; sourceLocation?: { start: number } }[];
    contracts?: Record<string, Record<string, { abi: Abi; evm: { bytecode: { object: string }; deployedBytecode: { object: string } } }>>;
  };
  const diagnostics: Diagnostic[] = (out.errors ?? []).map((e) => ({
    severity: e.severity === 'error' ? 'error' : e.severity === 'warning' ? 'warning' : 'info',
    message: e.message,
    line: e.sourceLocation && e.sourceLocation.start >= 0 ? lineAt(source, e.sourceLocation.start) : null,
  }));
  const contracts: CompiledContract[] = Object.entries(out.contracts?.[file] ?? {})
    .filter(([, c]) => c.evm.bytecode.object)
    .map(([name, c]) => ({
      name,
      abi: c.abi,
      bytecode: `0x${c.evm.bytecode.object}`,
      runtimeSize: c.evm.deployedBytecode.object.length / 2,
    }));
  return { contracts, diagnostics, ms: Math.round(performance.now() - t0) };
}
