import {
  FUND_ORDER,
  FUNDS,
  TOTAL_UNITS,
  type FundId,
  tokensToUnits,
} from "./tokenomics";
import { protocolAddress, txIdFor } from "./crypto";

export interface LedgerTx {
  id: string;
  from: string;
  to: string;
  amount: string;
  memo: string;
  ts: number;
  kind: "transfer" | "referral" | "airdrop" | "genesis";
}

export interface Ledger {
  balances: Record<string, string>;
  burned: string;
  txs: LedgerTx[];
}

export function fundAddress(id: FundId | "antisibil"): string {
  return protocolAddress(`fund:${id}`);
}

export function genesisLedger(): Ledger {
  const balances: Record<string, string> = {};
  for (const id of FUND_ORDER) {
    balances[fundAddress(id)] = (FUNDS[id].amount * 1_000_000n).toString();
  }
  balances[fundAddress("antisibil")] = "0";
  const genesisTx: LedgerTx = {
    id: txIdFor("genesis"),
    from: protocolAddress("mint:genesis"),
    to: protocolAddress("distribution"),
    amount: TOTAL_UNITS.toString(),
    memo: "genesis 10_000_000_000 SILAL",
    ts: 0,
    kind: "genesis",
  };
  const ledger: Ledger = { balances, burned: "0", txs: [genesisTx] };
  assertConservation(ledger);
  return ledger;
}

export function getBalance(ledger: Ledger, address: string): bigint {
  const v = ledger.balances[address];
  return v ? BigInt(v) : 0n;
}

export function sumBalances(ledger: Ledger): bigint {
  let s = 0n;
  for (const v of Object.values(ledger.balances)) s += BigInt(v);
  return s;
}

export function assertConservation(ledger: Ledger): void {
  const sum = sumBalances(ledger) + BigInt(ledger.burned);
  if (sum !== TOTAL_UNITS) {
    throw new Error(`SILAL conservation broken: ${sum} != ${TOTAL_UNITS}`);
  }
  for (const v of Object.values(ledger.balances)) {
    if (BigInt(v) < 0n) throw new Error("negative balance");
  }
}

export function applyTransfer(
  ledger: Ledger,
  input: {
    from: string;
    to: string;
    amount: bigint;
    memo?: string;
    kind?: LedgerTx["kind"];
    txId?: string;
    ts?: number;
  },
): { ok: true; ledger: Ledger } | { ok: false; error: string } {
  if (input.amount <= 0n) return { ok: false, error: "amount" };
  if (input.from === input.to) return { ok: false, error: "self" };
  const id =
    input.txId ??
    txIdFor(`${input.from}|${input.to}|${input.amount}|${input.memo ?? ""}|${input.ts ?? Date.now()}`);
  if (ledger.txs.some((t) => t.id === id && t.kind !== "genesis")) {
    return { ok: true, ledger }; // idempotent
  }
  const fromBal = getBalance(ledger, input.from);
  if (fromBal < input.amount) return { ok: false, error: "funds" };
  const toBal = getBalance(ledger, input.to);
  const next: Ledger = {
    burned: ledger.burned,
    balances: { ...ledger.balances },
    txs: [
      {
        id,
        from: input.from,
        to: input.to,
        amount: input.amount.toString(),
        memo: input.memo ?? "",
        ts: input.ts ?? Date.now(),
        kind: input.kind ?? "transfer",
      },
      ...ledger.txs,
    ],
  };
  next.balances[input.from] = (fromBal - input.amount).toString();
  next.balances[input.to] = (toBal + input.amount).toString();
  try {
    assertConservation(next);
  } catch {
    return { ok: false, error: "invariant" };
  }
  return { ok: true, ledger: next };
}

export { tokensToUnits };
