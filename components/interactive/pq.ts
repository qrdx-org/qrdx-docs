/**
 * Post-quantum helpers for the code runner, computed in the reader's browser with
 * @noble/post-quantum (the library QRDX Wallet uses). They reproduce the wallet and
 * the node byte for byte:
 *
 *   address     "0xPQ" + checksum(hex(keccak256(publicKey)[0..32]))
 *   accountId   keccak256("QRDX-ACCOUNT-ID-v1:pq:" ‖ raw32)[-20..]   (0x addresses: themselves)
 *   message     ML-DSA-65 over "\x19QRDX PQ Signed Message:\n" + byteLength + message
 */

import { ml_dsa65 } from '@noble/post-quantum/ml-dsa.js';
import { keccak_256 } from '@noble/hashes/sha3.js';
import { blake2b } from '@noble/hashes/blake2.js';

const utf8 = (s: string) => new TextEncoder().encode(s);

export function toHex(b: Uint8Array): string {
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}

export function fromHex(hex: string): Uint8Array {
  const clean = hex.replace(/^0x/i, '');
  if (!/^([0-9a-fA-F]{2})*$/.test(clean)) throw new Error('expected hex');
  return Uint8Array.from(clean.match(/../g) ?? [], (h) => parseInt(h, 16));
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

/** The wallet's toPqChecksumAddress: hex letters upper-cased where the checksum hash nibble is ≥ 8. */
export function pqChecksum(body: string): string {
  const clean = body.toLowerCase().replace(/^0xpq/, '');
  if (!/^[0-9a-f]{64}$/.test(clean)) throw new Error('a 0xPQ address has 64 hex characters');
  const hash = toHex(keccak_256(utf8(clean)));
  let out = '0xPQ';
  for (let i = 0; i < 64; i++) {
    const c = clean[i];
    out += /[0-9]/.test(c) ? c : parseInt(hash[i % hash.length], 16) >= 8 ? c.toUpperCase() : c;
  }
  return out;
}

export function pqAddress(publicKeyHex: string): string {
  return pqChecksum(toHex(keccak_256(fromHex(publicKeyHex)).slice(0, 32)));
}

export function accountId(address: string): string {
  if (/^0x[0-9a-fA-F]{40}$/.test(address)) return address.toLowerCase();
  if (!/^0xPQ[0-9a-fA-F]{64}$/i.test(address)) throw new Error('expected a 0x… or 0xPQ… address');
  const digest = keccak_256(concat(utf8('QRDX-ACCOUNT-ID-v1:pq:'), fromHex(address.slice(4))));
  return `0x${toHex(digest.slice(-20))}`;
}

export function prefixed(message: string): Uint8Array {
  const body = utf8(message);
  return concat(utf8(`\x19QRDX PQ Signed Message:\n${body.length}`), body);
}

export interface PqKeys {
  seed: string;
  publicKey: string;
  secretKey: string;
  address: string;
  accountId: string;
}

/** A key pair from a 32-byte seed (hex), or a random one. */
export function keygen(seedHex?: string): PqKeys {
  const seed = seedHex ? fromHex(seedHex) : crypto.getRandomValues(new Uint8Array(32));
  if (seed.length !== 32) throw new Error('the seed is 32 bytes (64 hex characters)');
  const k = ml_dsa65.keygen(seed);
  const publicKey = toHex(k.publicKey);
  const address = pqAddress(publicKey);
  return { seed: toHex(seed), publicKey, secretKey: toHex(k.secretKey), address, accountId: accountId(address) };
}

/** Sign a text message the way qrdx_signPQMessage does, or raw bytes ({ raw: true }, hex input) — e.g. exchange signing bytes. */
export function sign(message: string, secretKeyHex: string, opts: { raw?: boolean } = {}): string {
  const bytes = opts.raw ? fromHex(message) : prefixed(message);
  return toHex(ml_dsa65.sign(bytes, fromHex(secretKeyHex)));
}

export function verify(message: string, signatureHex: string, publicKeyHex: string, opts: { raw?: boolean } = {}): boolean {
  try {
    const bytes = opts.raw ? fromHex(message) : prefixed(message);
    return ml_dsa65.verify(fromHex(signatureHex), bytes, fromHex(publicKeyHex));
  } catch {
    return false;
  }
}

export function keccak256(input: string): string {
  return `0x${toHex(keccak_256(/^0x([0-9a-fA-F]{2})*$/.test(input) ? fromHex(input) : utf8(input)))}`;
}

/** BLAKE2b-256: an exchange transaction's hash is this over its signing bytes. */
export function blake2b256(input: string): string {
  return toHex(blake2b(/^0x([0-9a-fA-F]{2})*$/.test(input) ? fromHex(input) : utf8(input), { dkLen: 32 }));
}

export const SIZES = { publicKey: 1952, secretKey: 4032, signature: 3309 };
