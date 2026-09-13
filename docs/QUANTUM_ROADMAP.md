# Quantum roadmap

Marketing for v0.1: **the crypto core is ready for hybrid signatures**. Not “quantum-proof blockchain”.

## Now (classic)

- Signatures: Ed25519
- KEX: X25519
- Hash: BLAKE3 + SHA-256
- AEAD: XChaCha20-Poly1305
- KDF: Argon2id
- Mnemonic: BIP-39

`CryptoProvider = Classic | Hybrid | PostQuantum`. Only Classic is active.

## Phase 1 — hybrid

One operation carries Ed25519 **and** ML-DSA-65 (FIPS 204). Addresses become `addr_v2`. Migration: `MigrateAccount` signed by both keys; the old key is marked `legacy`.

KEM: ML-KEM-768 (FIPS 203).

## Phase 2 — long-term

SLH-DSA (SPHINCS+) as a conservative backup. `addr_v3`.

## Harvest-now-decrypt-later

Long-lived archive blobs should move to hybrid wrapping in P1. v0.1 stores hashes and sealed metadata on device; there is no public ciphertext lake yet.

PQ implementations must be swappable providers, not baked into the address format without a version bump.
