# Architecture

## Two runtimes, one domain

The product spec asks for Rust at the application layer and Ada/SPARK for critical invariants. This repository contains both.

| Layer | Where | Role |
|---|---|---|
| Web client | `src/` TanStack Start | Live UI: onboarding, wallet, silsila, archive, events, tukhum, referrals, i18n (ce/ru/en/es/de/fr) |
| Domain (TS) | `src/lib/si/` | Faithful port of tokenomics, kinship, ledger, vault for the browser |
| Domain (Rust) | `crates/` | Source of truth for invariants; `si` CLI |
| SPARK | `spark/` | Contracts for conservation, acyclicity, consent, hashes |
| FFI | `crates/si-spark-ffi` + `spark/include/si_spark_engine.h` | C ABI, no exceptions across the boundary |

A browser cannot hold keys outside a JS runtime and cannot run `gnatprove`. The web vault uses Argon2id + XChaCha20-Poly1305 via audited `@noble/*` crates, which match the native stack. Native `si-crypto` uses `ed25519-dalek`, `blake3`, `chacha20poly1305`, `argon2`, `zeroize`.

## Offline first

Tree, archive metadata, and ledger history live in the device vault / `localStorage`. The server, when it exists, is a relay for invites, events, and ciphertext. It does not own money and does not own kinship truth.

## Addresses

`addr_v1` — Ed25519, `si1…`  
`addr_v2` — hybrid (reserved)  
`addr_v3` — post-quantum (reserved)

Derivation intent: BIP-39 mnemonic, SLIP-0010 / `m/44'/549'/0'/0/i`. Web v0.1 uses a tagged HMAC-SHA512 child of the BIP-39 seed. Native wallet will take the full path.

## What v0.1 did not build

- Custom L1
- Dioxus / Tauri desktop (CLI stands in)
- Full `gnatprove` CI (sources + README are in `spark/`)
- W3C VC, Mekhk-khel case files, hybrid signatures as default
- Searchable encryption
