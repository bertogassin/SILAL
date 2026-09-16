import type { FundId } from "./tokenomics";

/** Public schedule clock — not a tradable unlock on a live chain. */
export const GENESIS_MS = Date.UTC(2026, 0, 1);

export type Vesting = { cliffMonths: number; durationMonths: number } | null;

export const FUND_VESTING: Record<FundId, Vesting> = {
  community: { cliffMonths: 0, durationMonths: 48 },
  ecosystem: { cliffMonths: 0, durationMonths: 36 },
  treasury: { cliffMonths: 6, durationMonths: 36 },
  contributors: { cliffMonths: 6, durationMonths: 24 },
  liquidity: { cliffMonths: 0, durationMonths: 24 },
  mediation: null,
  insurance: null,
  genesisAirdrop: null,
};

const MONTH_MS = 30 * 24 * 3600 * 1000;

export function vestedRatio(id: FundId, now = Date.now()): number {
  const v = FUND_VESTING[id];
  if (!v) return 1;
  const elapsed = Math.max(0, now - GENESIS_MS);
  if (elapsed < v.cliffMonths * MONTH_MS) return 0;
  return Math.min(1, elapsed / (v.durationMonths * MONTH_MS));
}

export interface GrantDraft {
  id: string;
  title: string;
  body: string;
  ask: string;
  createdAt: number;
  hash?: string;
}

export interface Workshop {
  id: string;
  title: string;
  place: string;
  contact: string;
  createdAt: number;
}

export interface AidPost {
  id: string;
  side: "need" | "offer";
  title: string;
  body: string;
  createdAt: number;
}

export interface Incident {
  id: string;
  title: string;
  body: string;
  createdAt: number;
  hash?: string;
}

export interface StudyNote {
  id: string;
  title: string;
  body: string;
  createdAt: number;
}

export interface Household {
  housing: string;
  travel: string;
  work: string;
}

export const EMPTY_HOUSEHOLD: Household = { housing: "", travel: "", work: "" };

/** Family treasury. Tokens sit on a derived address. They are not minted. */
export interface FamilyPot {
  id: string;
  title: string;
  createdAt: number;
  required: number;
}

/** Interest-free loan record. There is no rate field on purpose. */
export interface QardNote {
  id: string;
  to: string;
  amount: string;
  note: string;
  createdAt: number;
  repaidAt?: number;
}

/** Claim against the genesis insurance fund. Not an automatic payout. */
export interface InsuranceClaim {
  id: string;
  title: string;
  body: string;
  createdAt: number;
  hash: string;
  status: "filed";
}


