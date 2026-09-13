import { REFERRAL, tokensToUnits, shareOfPayout } from "./tokenomics";
import { applyTransfer, fundAddress, getBalance, type Ledger } from "./ledger";
import { blake3Hex } from "./crypto";

export interface ReferralState {
  code: string;
  referredBy?: string;
  qualified: boolean;
  qualifiedAt?: number;
  payoutTxIds: string[];
  appliedAt?: number;
}

export function codeFromAddress(address: string): string {
  const h = blake3Hex(`si.ref.v1:${address}`).slice(0, 8).toUpperCase();
  return `SI-${h}`;
}

export function parseInvite(raw: string): { kind: "ref" | "circle" | "event" | "device" | "pay"; code: string; extra?: string } | null {
  const t = raw.trim();
  const pay = t.match(/^si:\/\/pay\/(si1[a-z0-9]+)(?:\/([0-9]+(?:\.[0-9]+)?))?$/i);
  if (pay) return { kind: "pay", code: pay[1], extra: pay[2] };
  const deep = t.match(/^si:\/\/([rced])\/([A-Za-z0-9_-]+)$/i);
  if (deep) {
    const letter = deep[1].toLowerCase();
    const kind = letter === "r" ? "ref" : letter === "c" ? "circle" : letter === "e" ? "event" : "device";
    const code = kind === "ref" ? deep[2].toUpperCase() : deep[2];
    return { kind, code };
  }
  const code = t.replace(/^SI-/i, "SI-").toUpperCase();
  if (/^SI-[A-Z0-9]{4,12}$/.test(code)) return { kind: "ref", code };
  return null;
}

export function referrerEarnedInWindow(
  ledger: Ledger,
  referrer: string,
  windowMs = 30 * 24 * 3600 * 1000,
  now = Date.now(),
): bigint {
  const from = fundAddress("community");
  let s = 0n;
  for (const tx of ledger.txs) {
    if (tx.kind !== "referral") continue;
    if (tx.to !== referrer) continue;
    if (tx.from !== from) continue;
    if (now - tx.ts > windowMs) continue;
    s += BigInt(tx.amount);
  }
  return s;
}

export function applyReferralPayout(
  ledger: Ledger,
  opts: { referrer: string; referee: string; now?: number },
): { ok: true; ledger: Ledger } | { ok: false; error: string } {
  const now = opts.now ?? Date.now();
  const total = tokensToUnits(REFERRAL.payoutTokens);
  const earned = referrerEarnedInWindow(ledger, opts.referrer, 30 * 24 * 3600 * 1000, now);
  const cap = tokensToUnits(REFERRAL.monthlyCapTokens);
  const referrerShare = shareOfPayout(total, REFERRAL.referrerBps);
  if (earned + referrerShare > cap) return { ok: false, error: "cap" };

  const refereeShare = shareOfPayout(total, REFERRAL.refereeBps);
  const antiShare = total - referrerShare - refereeShare;
  const community = fundAddress("community");
  if (getBalance(ledger, community) < total) return { ok: false, error: "fund" };

  let next = ledger;
  const r1 = applyTransfer(next, {
    from: community,
    to: opts.referrer,
    amount: referrerShare,
    memo: `referral:${opts.referee}:referrer`,
    kind: "referral",
    ts: now,
    txId: `ref:${opts.referrer}:${opts.referee}:r`,
  });
  if (!r1.ok) return r1;
  next = r1.ledger;
  const r2 = applyTransfer(next, {
    from: community,
    to: opts.referee,
    amount: refereeShare,
    memo: `referral:${opts.referee}:welcome`,
    kind: "referral",
    ts: now,
    txId: `ref:${opts.referrer}:${opts.referee}:w`,
  });
  if (!r2.ok) return r2;
  next = r2.ledger;
  const r3 = applyTransfer(next, {
    from: community,
    to: fundAddress("antisibil"),
    amount: antiShare,
    memo: `referral:${opts.referee}:antisibil`,
    kind: "referral",
    ts: now,
    txId: `ref:${opts.referrer}:${opts.referee}:a`,
  });
  if (!r3.ok) return r3;
  return { ok: true, ledger: r3.ledger };
}
