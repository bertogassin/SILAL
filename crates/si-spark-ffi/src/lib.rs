//! When `gnatprove` is available, link `libsi_spark_engine` and enable
//! feature `ada`. Until then this crate mirrors the contracts in Rust.

use si_silsila::{kinship_check, Edge, KinshipKind, Person};
#[cfg(not(feature = "ada"))]
use si_tokenomics::TOTAL_UNITS;

#[cfg(feature = "ada")]
mod ada {
    unsafe extern "C" {
        pub fn si_ledger_conservation(sum_balances: u128, burned: u128) -> i32;
        // Not called yet: `kinship_blocked` below uses si-silsila's full
        // Rust DFS for every edge, and this only ever checked a trivial
        // self-cycle (see spark/include/si_spark_engine.h) - reserved for
        // when that's actually wired up, not dead by accident.
        #[allow(dead_code)]
        pub fn si_kinship_acyclic(from_hash: u64, to_hash: u64) -> i32;
    }
}

pub fn conservation_holds(sum_balances: u128, burned: u128) -> bool {
    #[cfg(feature = "ada")]
    {
        return unsafe { ada::si_ledger_conservation(sum_balances, burned) == 1 };
    }
    #[cfg(not(feature = "ada"))]
    {
        sum_balances + burned == TOTAL_UNITS
    }
}

pub fn kinship_blocked(people: &[Person], edges: &[Edge], a: &str, b: &str) -> bool {
    kinship_check(people, edges, a, b).kind == KinshipKind::BlockedByPolicy
}
