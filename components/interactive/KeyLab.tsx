'use client';

import { useEffect, useMemo, useState } from 'react';
import { KeyRound, PenLine, RotateCcw, ShieldCheck, ShieldX } from 'lucide-react';
import { ByteField } from './ByteField';
import { fromHex, keygen, sign, toHex, verify, SIZES, type PqKeys } from './pq';

/** secp256k1, for scale: a compressed public key and a recoverable ECDSA signature. */
const CLASSIC = { publicKey: 33, signature: 65 };

/**
 * ML-DSA-65 in the reader's browser, with @noble/post-quantum, the library QRDX Wallet uses: make
 * a key pair, see its public key and a signature byte by byte beside a classic key's to scale, and
 * break the signature (flip a bit, or change the message) to watch verification refuse it. Nothing
 * leaves the page.
 */
export function KeyLab() {
  const [keys, setKeys] = useState<PqKeys | null>(null);
  const [message, setMessage] = useState('Every block is signed post-quantum.');
  const [signed, setSigned] = useState<{ message: string; signature: Uint8Array } | null>(null);
  const [flipped, setFlipped] = useState<Set<number>>(new Set());

  const fresh = () => {
    const k = keygen();
    setKeys(k);
    setSigned(null);
    setFlipped(new Set());
  };
  useEffect(fresh, []);

  const publicKey = useMemo(() => (keys ? fromHex(keys.publicKey) : null), [keys]);
  const signature = useMemo(() => {
    if (!signed) return null;
    const s = signed.signature.slice();
    for (const i of flipped) s[i] ^= 0x01;
    return s;
  }, [signed, flipped]);
  const valid = useMemo(() => (keys && signature ? verify(message, toHex(signature), keys.publicKey) : null), [keys, signature, message]);

  const doSign = () => {
    if (!keys) return;
    setSigned({ message, signature: fromHex(sign(message, keys.secretKey)) });
    setFlipped(new Set());
  };
  const flip = (i: number) =>
    setFlipped((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  const why = !signed
    ? null
    : valid
      ? 'The signature checks against this public key and these exact bytes.'
      : [message !== signed.message && 'the message changed after it was signed', flipped.size > 0 && `${flipped.size} byte${flipped.size > 1 ? 's' : ''} of the signature flipped`]
          .filter(Boolean)
          .join(', and ')
          .replace(/^./, (c) => c.toUpperCase()) + '.';

  return (
    <div className="not-prose my-6 overflow-hidden rounded-xl border border-fd-border bg-fd-card">
      <div className="flex items-center justify-between gap-3 border-b border-fd-border px-3 py-2 text-xs">
        <span className="inline-flex items-center gap-2 font-medium">
          <KeyRound className="h-3.5 w-3.5" /> ML-DSA-65, in your browser
        </span>
        <button type="button" onClick={fresh} className="inline-flex items-center gap-1.5 rounded-md border border-fd-border px-2 py-1 hover:bg-fd-accent">
          <RotateCcw className="h-3 w-3" /> New key
        </button>
      </div>

      <div className="space-y-5 p-4">
        <p className="text-[11px] text-fd-muted-foreground">One dot per byte, larger for larger values; the classic key and signature beside them are to the same scale.</p>
        <div>
          <div className="text-[11px] text-fd-muted-foreground">Its address: keccak-256 of the public key, the first 32 bytes, checksummed</div>
          <div className="mt-0.5 break-all font-mono text-xs">{keys?.address ?? '…'}</div>
        </div>

        <div className="flex flex-wrap items-start gap-x-8 gap-y-5">
          <ByteField bytes={publicKey} count={SIZES.publicKey} label="ML-DSA-65 public key" />
          <div className="lg:w-[132px]">
            <ByteField count={CLASSIC.publicKey} label="secp256k1" />
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <label className="min-w-0 flex-1">
            <span className="text-[11px] text-fd-muted-foreground">Message</span>
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="mt-0.5 w-full rounded-md border border-fd-border bg-fd-background px-2.5 py-1.5 font-mono text-xs outline-none focus:border-fd-foreground/40"
            />
          </label>
          <button
            type="button"
            onClick={doSign}
            disabled={!keys}
            className="inline-flex items-center gap-1.5 rounded-md bg-fd-primary px-3 py-1.5 text-xs font-medium text-fd-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            <PenLine className="h-3.5 w-3.5" /> Sign
          </button>
        </div>

        {signature ? (
          <>
            <div className="flex flex-wrap items-start gap-x-8 gap-y-5">
              <ByteField bytes={signature} count={SIZES.signature} flipped={flipped} onPick={flip} label="ML-DSA-65 signature: click a byte to flip a bit" />
              <div className="lg:w-[132px]">
                <ByteField count={CLASSIC.signature} label="ECDSA" />
              </div>
            </div>
            <div className={`flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-xs ${valid ? 'border-bid/40' : 'border-ask/50'}`}>
              {valid ? <ShieldCheck className="h-4 w-4 text-bid" /> : <ShieldX className="h-4 w-4 text-ask" />}
              <span className="font-medium">{valid ? 'Verified' : 'Rejected'}</span>
              <span className="text-fd-muted-foreground">{why}</span>
              {!valid && (
                <button
                  type="button"
                  onClick={() => (setFlipped(new Set()), setMessage(signed!.message))}
                  className="ml-auto inline-flex items-center gap-1 rounded-md border border-fd-border px-2 py-0.5 hover:bg-fd-accent"
                >
                  <RotateCcw className="h-3 w-3" /> Restore
                </button>
              )}
            </div>
          </>
        ) : (
          <p className="text-xs text-fd-muted-foreground">Sign the message to see its 3,309-byte signature, then try to forge it.</p>
        )}
      </div>
    </div>
  );
}
