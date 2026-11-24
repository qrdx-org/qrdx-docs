'use client';

/**
 * QRDX Wallet from a docs page (docs/build/wallet-integration): found by EIP-6963 (rdns
 * org.qrdx.wallet), else `window.qrdx`. Everything it signs, the reader approves in the wallet.
 */

export interface Eip1193 {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  on?(event: string, cb: (...args: unknown[]) => void): void;
  removeListener?(event: string, cb: (...args: unknown[]) => void): void;
}

export interface QrdxAccount {
  /** The classic key's 0x address. */
  address: `0x${string}`;
  pqAddress: string;
  /** The post-quantum account's 20-byte ID: msg.sender of its transactions. */
  pqAccountId: `0x${string}`;
}

/** The QRDX Wallet provider, or null when it is not installed. */
export function findQrdxWallet(timeoutMs = 400): Promise<Eip1193 | null> {
  if (typeof window === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    let done = false;
    const finish = (p: Eip1193 | null) => {
      if (done) return;
      done = true;
      window.removeEventListener('eip6963:announceProvider', onAnnounce as EventListener);
      resolve(p);
    };
    const onAnnounce = (e: CustomEvent<{ info?: { rdns?: string }; provider?: Eip1193 }>) => {
      if (e.detail?.info?.rdns === 'org.qrdx.wallet' && e.detail.provider) finish(e.detail.provider);
    };
    window.addEventListener('eip6963:announceProvider', onAnnounce as EventListener);
    window.dispatchEvent(new Event('eip6963:requestProvider'));
    setTimeout(() => finish((window as unknown as { qrdx?: Eip1193 }).qrdx ?? null), timeoutMs);
  });
}

/** Asks the reader to connect; the first account the wallet grants. */
export async function connectQrdx(wallet: Eip1193): Promise<QrdxAccount> {
  const accounts = (await wallet.request({ method: 'qrdx_requestAccounts' })) as QrdxAccount[];
  if (!accounts?.length) throw new Error('The wallet granted no account.');
  return accounts[0];
}

export async function walletChainId(wallet: Eip1193): Promise<number> {
  return parseInt(String(await wallet.request({ method: 'eth_chainId' })), 16);
}

/** Asks the wallet to move to `chainId` (it asks the reader). */
export async function switchChain(wallet: Eip1193, chainId: number): Promise<void> {
  await wallet.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: `0x${chainId.toString(16)}` }] });
}

/** A wallet error as one sentence: the reader declining is not a failure worth a stack. */
export function walletError(e: unknown): string {
  const err = e as { code?: number; message?: string };
  if (err?.code === 4001) return 'You declined in the wallet.';
  if (err?.code === 4100) return 'Connect the wallet first.';
  if (/ECDSA key is turned off/i.test(err?.message ?? ''))
    return "This account has turned its classic key off (quantum migration), so the node refuses what it signs. Use the post-quantum signer.";
  return err?.message ?? String(e);
}
