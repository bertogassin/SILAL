# si workspace notes

## Ada/SPARK engine (`si-spark-ffi`)

`crates/si-spark-ffi` is a wrapper around a planned Ada/SPARK engine
(`spark/`), gated behind the Cargo feature `ada` (optional, off by default).

**Current state, as of this environment: the Ada/SPARK engine is not
connected.**

- No Ada/SPARK toolchain (GNAT, Alire, `gnatprove`) is installed here, and
  none has been run. `spark/src/*.adb`/`*.ads` exist as source but have never
  been proved or built in this repo's history — see `spark/README.md`.
- No `libsi_spark_engine` static/shared library has ever been built, so the
  `ada` feature has nothing to link against yet. `build.rs` only emits the
  link directives when the feature is enabled; it does not build the
  library itself.
- `conservation_holds` (SILAL conservation: `sum_balances + burned ==
  TOTAL_UNITS`) and kinship acyclicity (via `si_silsila::kinship_check`'s DFS,
  used by `kinship_blocked`) both run on **plain Rust today**, feature `ada`
  on or off. The `si_ledger_conservation`/`si_kinship_acyclic` extern
  declarations in `crates/si-spark-ffi/src/lib.rs` are the intended FFI entry
  points for the Ada/SPARK versions of these checks, but nothing currently
  calls the kinship one, and the ledger one is unreachable unless `ada` is
  both enabled *and* actually linked against a real library.
- No proof has ever been produced (`gnatprove` has never run against
  `spark/si_spark_engine.gpr` in this repo), so none of the SPARK contracts
  documented in `spark/README.md` (conservation, non-negative balances,
  idempotent transfer, kinship acyclicity, consent-before-publish, hash
  chain) have machine-checked proofs backing them. The Rust side has unit
  tests instead; those test Rust logic, not the SPARK contracts.

**What has to change for this to become real:**

1. Install a GNAT/SPARK toolchain (e.g. via Alire: `alr install gnatprove`)
   somewhere this workspace can build against.
2. Build `spark/` as an actual library (the current `.gpr` has no
   `Library_Kind`/`Library_Name`, so it isn't configured to produce
   `libsi_spark_engine` yet — that needs to be added).
3. Run `gnatprove -P spark/si_spark_engine.gpr --level=2` and get it to a
   clean pass; until that command has actually been run and passed, no
   claim of a proved invariant is true, regardless of what any comment says.
4. Point `crates/si-spark-ffi/build.rs` (via `SI_SPARK_ENGINE_LIB_DIR`, or by
   fixing the default path once the library actually lands there) at the
   built `libsi_spark_engine`, build `si-spark-ffi` with `--features ada`,
   and confirm `si_ledger_conservation`/`si_kinship_acyclic` are actually
   wired up and called (today only the ledger one is called at all).
5. Re-run the full test suite with `--features ada` and treat any behavior
   difference from the Rust fallback as a bug in one of the two
   implementations, not as expected drift.

Until all of the above has happened, treat any statement that "the Ada/SPARK
engine enforces X" as aspirational, not current.
