#!/usr/bin/env bash
# SPARK proof CI stand-in. Does not fake gnatprove.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

need=(
  spark/src/ledger.ads
  spark/src/kinship.ads
  spark/src/consent.ads
  spark/src/hashing.ads
  spark/src/bank.ads
  spark/si_spark_engine.gpr
)
for f in "${need[@]}"; do
  [[ -f "$f" ]] || { echo "missing $f"; exit 1; }
done

echo "spark sources present"

if command -v cargo >/dev/null 2>&1; then
  cargo test -p si-tokenomics -p si-silsila --offline -- --test-threads=1
else
  echo "cargo not in PATH — skip rust stand-in"
fi

if command -v gnatprove >/dev/null 2>&1; then
  gnatprove -P spark/si_spark_engine.gpr --level=2
else
  echo "gnatprove not installed — Ada contracts stay as source. This is not a fake proof."
fi
