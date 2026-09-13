# si

si helps your people know their people, keep the kin, agree, and hold value with care.

Application: **si**. Token: **SILAL** (10 billion, 6 decimals). Wallet: **Si Wallet**. Tree: **Silsila**. Circle: **Tukhum**.

The interface is Chechen, Russian, English, Spanish, German, and French. The app does not judge, brand, or avenge.

## What you can do in this build

- Create or import a wallet (BIP-39, Argon2id vault)
- See a 0 SILAL home, referral code, and the 10B genesis table
- Build a Silsila from your people, import/export GEDCOM, 9/5 kinship calculator (family policy, not a state ban)
- Hash documents; family co-sign; Si Cred with selective reveal (not a social score)
- Mekhk-khel cases with consent of the parties (not a court)
- Your own zemlyachestvo gatherings, RSVP, calendar
- Private Tukhum circle, hidden profile, private block
- Hybrid-signature flag (Ed25519 still; addr_v2 reserved)
- Network connector that stays honest: no public L1, liquidity fund on the device
- Vault fingerprint QR + sealed-vault file for another device (password stays spoken)
- Adat / sharia handbook as study, marked custom ≠ law
- House: fund vesting, grant drafts, craft cards, care documents, mutual aid — no ratings, no clinic, no exchange
- Six languages, dark / light, si sounds, offline cache on the device

SILAL here lives on a **local dev-ledger**. There is no custom L1 in v0.1.

## Layout

```
src/                 web client (this preview)
src/lib/si/          tokenomics, vault, silsila, ledger
crates/              Rust workspace
spark/               Ada/SPARK contracts
apps/si-cli/         `si` binary
docs/                ethics, token, architecture, quantum, threats
design/              tokens.json, sound notes
```

## Native CLI

```
cargo test -p si-tokenomics -p si-silsila -p si-archive
cargo run -p si-cli -- token genesis-info
cargo run -p si-cli -- wallet new
cargo run -p si-cli -- silsila check --a NAME --b NAME
cargo run -p si-cli -- ref apply SI-XXXX
```

SPARK: see `spark/README.md`. `gnatprove` is not in this environment; sources and contracts are still in tree.

## Why the live UI is a web client

The specification wants 100% Rust at the application layer (Tauri/Dioxus) and SPARK for the data kernel. A browser preview cannot run that stack or keep seed material out of JS. The nearest honest MVP is this web client plus compiling Rust crates and SPARK contracts that the native apps will call through `si_spark_engine.h`.

Fonts are free (Unbounded, Manrope, Source Serif 4). Sounds are generated, not sampled from anyone’s library.

## Forbidden, and not present

Social credit, quiet blacklists, pyramid referrals, hidden mint, blood feud as code, selling the kinship graph, on-chain living minors.
