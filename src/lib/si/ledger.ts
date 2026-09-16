import { FUND_ORDER, FUNDS, TOTAL_UNITS, type FundId } from "./tokenomics";
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

export function ledgerHolds(ledger: Ledger): boolean {
  try {
    assertConservation(ledger);
    return true;
  } catch {
    return false;
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
  const id = input.txId ?? txIdFor(`${input.from}|${input.to}|${input.amount}|${input.ts ?? 0}|${input.memo ?? ""}`);
  if (ledger.txs.some((t) => t.id === id)) return { ok: true, ledger };
  const fromBal = getBalance(ledger, input.from);
  if (fromBal < input.amount) return { ok: false, error: "funds" };
  const toBal = getBalance(ledger, input.to);
  const balances = { ...ledger.balances };
  balances[input.from] = (fromBal - input.amount).toString();
  balances[input.to] = (toBal + input.amount).toString();
  const tx: LedgerTx = {
    id,
    from: input.from,
    to: input.to,
    amount: input.amount.toString(),
    memo: input.memo ?? "",
    ts: input.ts ?? Date.now(),
    kind: input.kind ?? "transfer",
  };
  const next: Ledger = { balances, burned: ledger.burned, txs: [...ledger.txs, tx] };
  try {
    assertConservation(next);
  } catch {
    return { ok: false, error: "conservation" };
  }
  return { ok: true, ledger: next };
}
