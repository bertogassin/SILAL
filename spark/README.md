# si-spark-engine

Ada 2012 + SPARK 2014 contracts for the invariants that must not drift:

1. SILAL conservation (10_000_000_000 tokens, 6 decimals)
2. Non-negative balances, no implicit mint
3. Transfer idempotence by `tx_id`
4. Kinship: allowed edge types, acyclicity, 9/5 lines, `Allowed | Warning | BlockedByPolicy` (never a state ban)
5. Consent of a living person before publish
6. Document hash chain

## Prove

This sandbox does not ship GNAT. On a machine with Alire / FSF GNAT:

```
alr install gnatprove
gnatprove -P spark/si_spark_engine.gpr --level=2
```

Until then, `npm run spark:ci` checks the Ada sources exist and runs the Rust stand-in. It does **not** print a fake proof.
