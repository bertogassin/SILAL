# SILAL

Ticker: `SILAL`  
Supply: **exactly 10_000_000_000**  
Decimals: **6** (1 SILAL = 1_000_000 units)  
No post-genesis mint.

## Genesis

| Fund | Share | Amount | Rule |
|---|---:|---:|---|
| Community & referrals | 30% | 3_000_000_000 | vesting + anti-sybil |
| Ecosystem / grants / events | 20% | 2_000_000_000 | multi-sig council |
| Treasury | 15% | 1_500_000_000 | 36m vesting, 6m cliff |
| Early contributors | 10% | 1_000_000_000 | 24m vesting, 6m cliff |
| Liquidity | 10% | 1_000_000_000 | partially locked |
| Mediation & archive | 8% | 800_000_000 | spent on useful work |
| Insurance / bounty | 4% | 400_000_000 | incidents only |
| Genesis airdrop (verified families) | 3% | 300_000_000 | not a dream sale |

Constants live in `crates/si-tokenomics` and `src/lib/si/tokenomics.ts`. Tests fail if the parts do not sum to 10 billion.

## Utility (not equity)

Archive storage, document anchors, mediator tips, a visibility boost for *one’s own* events (not a reputation purchase), referral rewards from the community fund.

SILAL is not a share, not a passport, not an indulgence, not a moral score.

## Referral (anti-abuse)

- Depth **1**. Ten-line schemes are forbidden.
- Pays only from the community fund, once per qualified person.
- Split: 70% inviter, 20% welcome, 10% anti-sybil fund.
- Qualifying action: 7 days, or first document hash, or one gathering RSVP.
- Monthly cap per inviter: 10_000 SILAL in this MVP (constant `REFERRAL_MONTHLY_CAP_TOKENS`).

## Network

v0.1 uses a local deterministic **dev-ledger** that obeys the SPARK conservation contract. A public L1 connector (one of Solana / Cosmos / Substrate) is P2. There is no custom L1 in this release.
