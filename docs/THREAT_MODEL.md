# Threat model

| Threat | Countermeasure in v0.1 |
|---|---|
| Seed theft | Argon2id vault, zeroize, seed shown once, no copy default, CSS `user-select: none`, blur-on-unfocus planned native FLAG_SECURE |
| Relative substitution in the graph | Dual assertion later; v0.1 requires explicit edges, rejects cycles, living people need consent to publish |
| Sybil referrals | Depth 1, qualifying action, monthly cap, 10% anti-sybil split, device-local only (no automated eternal ban) |
| Archive leak | Hash + local seal; file bytes are not uploaded |
| Malicious server | Server does not hold keys, balances, or kinship truth |
| Malicious circle moderator | No super-ban of a person from life; leave the circle |
| Quantum HNDL | Versioned addresses; hybrid provider reserved; do not promise PQ-safe L1 |

The application never includes a silent admin “take coins” control. Conservation is an invariant, not a UI setting.
