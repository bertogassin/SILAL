import { blake3Hex, type SealedVault } from "./crypto";

export function vaultFingerprint(vault: SealedVault): string {
  return blake3Hex(`si.vault.fp.v1:${vault.salt}:${vault.nonce}:${vault.ciphertext}`)
    .slice(0, 16)
    .toUpperCase();
}

export function pairingUri(fingerprint: string): string {
  return `si://d/${fingerprint}`;
}

export function isSealedVault(v: unknown): v is SealedVault {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return o.v === 1 && o.kdf === "argon2id" && typeof o.ciphertext === "string";
}
