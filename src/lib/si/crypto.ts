import { getPublicKey, sign, verify, hashes } from "@noble/ed25519";
import { sha256, sha512 } from "@noble/hashes/sha2.js";
import { blake3 } from "@noble/hashes/blake3.js";
import { hmac } from "@noble/hashes/hmac.js";
import { argon2idAsync } from "@noble/hashes/argon2.js";
import { xchacha20poly1305 } from "@noble/ciphers/chacha.js";
import { bytesToHex, hexToBytes, randomBytes } from "@noble/hashes/utils.js";
import {
  generateMnemonic as bip39Generate,
  mnemonicToSeedSync,
  validateMnemonic,
} from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";

hashes.sha512 = sha512;

const TE = new TextEncoder();
const TD = new TextDecoder();

const B32 = "abcdefghijklmnopqrstuvwxyz234567";

export type CryptoProvider = "classic" | "hybrid" | "post-quantum";

/** MVP uses classic. Hybrid (Ed25519 + ML-DSA-65) is a flag, not a break. */
export const ACTIVE_PROVIDER: CryptoProvider = "classic";
export const ADDR_VERSION_V1 = 0x01;
export const ADDR_VERSION_PROTOCOL = 0x00;

const ARGON2_OPTS = {
  t: 2,
  m: 8192,
  p: 1,
  dkLen: 32,
  maxmem: 32 * 1024 * 1024,
};

function toBits(bytes: Uint8Array): number[] {
  const bits: number[] = [];
  for (const b of bytes) {
    for (let i = 7; i >= 0; i--) bits.push((b >> i) & 1);
  }
  return bits;
}

export function encodeBase32(bytes: Uint8Array): string {
  const bits = toBits(bytes);
  while (bits.length % 5 !== 0) bits.push(0);
  let out = "";
  for (let i = 0; i < bits.length; i += 5) {
    const n =
      (bits[i] << 4) |
      (bits[i + 1] << 3) |
      (bits[i + 2] << 2) |
      (bits[i + 3] << 1) |
      bits[i + 4];
    out += B32[n];
  }
  return out;
}

export function decodeBase32(s: string): Uint8Array | null {
  const clean = s.toLowerCase().replace(/[^a-z2-7]/g, "");
  const bits: number[] = [];
  for (const ch of clean) {
    const n = B32.indexOf(ch);
    if (n < 0) return null;
    for (let i = 4; i >= 0; i--) bits.push((n >> i) & 1);
  }
  const out = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < out.length; i++) {
    let v = 0;
    for (let j = 0; j < 8; j++) v = (v << 1) | bits[i * 8 + j];
    out[i] = v;
  }
  return out;
}

export function blake3Bytes(data: Uint8Array | string): Uint8Array {
  return blake3(typeof data === "string" ? TE.encode(data) : data);
}

export function sha256Hex(data: Uint8Array | string): string {
  const d = typeof data === "string" ? TE.encode(data) : data;
  return bytesToHex(sha256(d));
}

export function blake3Hex(data: Uint8Array | string): string {
  return bytesToHex(blake3Bytes(data));
}

/** Sorted binary merkle of hex leaves. Empty set has a tagged empty root. */
export function merkleRootHex(leaves: string[]): string {
  if (leaves.length === 0) return blake3Hex("si.merkle.empty");
  let layer = leaves.map((h) => blake3Hex(`si.leaf:${h}`)).sort();
  while (layer.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < layer.length; i += 2) {
      const a = layer[i];
      const b = layer[i + 1] ?? a;
      next.push(blake3Hex(a <= b ? `si.node:${a}:${b}` : `si.node:${b}:${a}`));
    }
    layer = next;
  }
  return layer[0];
}

export function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const len = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(len);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

export function zeroize(buf: Uint8Array): void {
  buf.fill(0);
}

export function formatAddress(payload16: Uint8Array, version: number): string {
  const body = new Uint8Array(17);
  body[0] = version;
  body.set(payload16.subarray(0, 16), 1);
  const checksum = blake3Bytes(concatBytes(TE.encode("si.addr.v1"), body)).subarray(0, 3);
  const encoded = encodeBase32(concatBytes(body, checksum));
  return `si1${encoded}`;
}

export function parseAddress(addr: string): { version: number; payload: Uint8Array } | null {
  const t = addr.trim().toLowerCase();
  if (!t.startsWith("si1") || t.length < 20) return null;
  const raw = decodeBase32(t.slice(3));
  if (!raw || raw.length < 20) return null;
  const body = raw.subarray(0, 17);
  const checksum = raw.subarray(17, 20);
  const expect = blake3Bytes(concatBytes(TE.encode("si.addr.v1"), body)).subarray(0, 3);
  if (checksum[0] !== expect[0] || checksum[1] !== expect[1] || checksum[2] !== expect[2]) {
    return null;
  }
  return { version: body[0], payload: body.subarray(1) };
}

export function isSiAddress(addr: string): boolean {
  return parseAddress(addr) !== null;
}

export function protocolAddress(tag: string): string {
  const h = blake3Bytes(`si.protocol.v1:${tag}`);
  return formatAddress(h.subarray(0, 16), ADDR_VERSION_PROTOCOL);
}

export function publicKeyToAddress(publicKey: Uint8Array): string {
  const h = blake3Bytes(concatBytes(TE.encode("si.addr.ed25519.v1"), publicKey));
  return formatAddress(h.subarray(0, 16), ADDR_VERSION_V1);
}

export function generateMnemonic12(): string {
  return bip39Generate(wordlist, 128);
}

export function mnemonicIsValid(phrase: string): boolean {
  const normalized = phrase.trim().toLowerCase().split(/\s+/).join(" ");
  return validateMnemonic(normalized, wordlist);
}

export function normalizeMnemonic(phrase: string): string {
  return phrase.trim().toLowerCase().split(/\s+/).filter(Boolean).join(" ");
}

/**
 * SLIP-0010 master key for Ed25519, then a tagged child for account 0.
 * Full path m/44'/549'/0'/0/i is implemented in the Rust wallet.
 */
export function mnemonicToSecretKey(mnemonic: string, accountIndex = 0): Uint8Array {
  const seed = mnemonicToSeedSync(normalizeMnemonic(mnemonic));
  const master = hmac(sha512, TE.encode("ed25519 seed"), seed);
  const key = master.subarray(0, 32);
  const child = hmac(
    sha512,
    concatBytes(TE.encode("si.slip10.v1"), key),
    new Uint8Array([accountIndex & 0xff]),
  );
  zeroize(master);
  zeroize(seed);
  const sk = child.subarray(0, 32);
  return sk;
}

export function secretToPublic(secretKey: Uint8Array): Uint8Array {
  return getPublicKey(secretKey);
}

export function signMessage(secretKey: Uint8Array, message: Uint8Array | string): Uint8Array {
  const m = typeof message === "string" ? TE.encode(message) : message;
  return sign(m, secretKey);
}

export function signUtf8Hex(secretKeyHex: string, message: string): string {
  return bytesToHex(signMessage(hexToBytes(secretKeyHex), message));
}

export function verifyUtf8Hex(publicKeyHex: string, message: string, signatureHex: string): boolean {
  try {
    return verifyMessage(hexToBytes(publicKeyHex), message, hexToBytes(signatureHex));
  } catch {
    return false;
  }
}

export function verifyMessage(
  publicKey: Uint8Array,
  message: Uint8Array | string,
  signature: Uint8Array,
): boolean {
  const m = typeof message === "string" ? TE.encode(message) : message;
  return verify(signature, m, publicKey);
}

export interface SealedVault {
  v: 1;
  kdf: "argon2id";
  aead: "xchacha20poly1305";
  salt: string;
  nonce: string;
  ciphertext: string;
}

export interface VaultPlain {
  mnemonic: string;
  secretKeyHex: string;
  publicKeyHex: string;
  address: string;
  createdAt: number;
}

export async function sealVault(plain: VaultPlain, password: string): Promise<SealedVault> {
  const salt = randomBytes(16);
  const nonce = randomBytes(24);
  const key = await argon2idAsync(TE.encode(password), salt, ARGON2_OPTS);
  const aead = xchacha20poly1305(key, nonce);
  const payload = TE.encode(JSON.stringify(plain));
  const ciphertext = aead.encrypt(payload);
  zeroize(key);
  zeroize(payload);
  return {
    v: 1,
    kdf: "argon2id",
    aead: "xchacha20poly1305",
    salt: bytesToHex(salt),
    nonce: bytesToHex(nonce),
    ciphertext: bytesToHex(ciphertext),
  };
}

export async function unsealVault(vault: SealedVault, password: string): Promise<VaultPlain> {
  const salt = hexToBytes(vault.salt);
  const nonce = hexToBytes(vault.nonce);
  const ciphertext = hexToBytes(vault.ciphertext);
  const key = await argon2idAsync(TE.encode(password), salt, ARGON2_OPTS);
  try {
    const aead = xchacha20poly1305(key, nonce);
    const payload = aead.decrypt(ciphertext);
    const json = TD.decode(payload);
    zeroize(payload);
    return JSON.parse(json) as VaultPlain;
  } finally {
    zeroize(key);
  }
}

export function newWalletFromMnemonic(mnemonic: string): VaultPlain {
  const normalized = normalizeMnemonic(mnemonic);
  const sk = mnemonicToSecretKey(normalized);
  const pk = secretToPublic(sk);
  const address = publicKeyToAddress(pk);
  const plain: VaultPlain = {
    mnemonic: normalized,
    secretKeyHex: bytesToHex(sk),
    publicKeyHex: bytesToHex(pk),
    address,
    createdAt: Date.now(),
  };
  zeroize(sk);
  return plain;
}

export function txIdFor(payload: string): string {
  return blake3Hex(`si.tx.v1:${payload}`);
}

export { bytesToHex, hexToBytes, randomBytes };
