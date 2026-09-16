#ifndef SI_SPARK_ENGINE_H
#define SI_SPARK_ENGINE_H

#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

/* 1 if sum_balances + burned == 10_000_000_000_000_000 */
int32_t si_ledger_conservation(unsigned __int128 sum_balances,
                               unsigned __int128 burned);

/* 1 if the proposed parent edge is not a trivial self-cycle.
   Full DFS acyclicity lives in si-silsila until gnatprove CI is on. */
int32_t si_kinship_acyclic(uint64_t from_hash, uint64_t to_hash);

#ifdef __cplusplus
}
#endif

#endif
