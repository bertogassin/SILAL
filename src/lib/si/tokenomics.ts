/**
 * SILAL genesis — source of truth mirrored by crates/si-tokenomics.
 * Supply is fixed. There is no post-genesis mint.
 */
export const TICKER = "SILAL";
export const TOKEN_NAME = "SILAL";
export const APP_NAME = "si";
export const TOTAL_SUPPLY = 10_000_000_000n;
export const DECIMALS = 6;
export const UNITS_PER_TOKEN = 1_000_000n;
export const TOTAL_UNITS = TOTAL_SUPPLY * UNITS_PER_TOKEN;

/** Unregistered SLIP-44 coin type. Native derivation: m/44'/549'/0'/0/i */
export const SLIP44_SILAL = 549;

export const FUNDS = {
  community: {
    id: "community",
    bps: 3000,
    amount: 3_000_000_000n,
    rule: "vesting + anti-sybil; referral payouts",
  },
  ecosystem: {
    id: "ecosystem",
    bps: 2000,
    amount: 2_000_000_000n,
    rule: "grants / events, multi-sig council",
  },
  treasury: {
    id: "treasury",
    bps: 1500,
    amount: 1_500_000_000n,
    rule: "36 month vesting, 6 month cliff",
  },
  contributors: {
    id: "contributors",
    bps: 1000,
    amount: 1_000_000_000n,
    rule: "24 month vesting, 6 month cliff",
  },
  liquidity: {
    id: "liquidity",
    bps: 1000,
    amount: 1_000_000_000n,
    rule: "partially locked market making",
  },
  mediation: {
    id: "mediation",
    bps: 800,
    amount: 800_000_000n,
    rule: "spent on mediation and archive utility",
  },
  insurance: {
    id: "insurance",
    bps: 400,
    amount: 400_000_000n,
    rule: "incidents and bug bounty only",
  },
  genesisAirdrop: {
    id: "genesisAirdrop",
    bps: 300,
    amount: 300_000_000n,
    rule: "verified families — not a dream sale",
  },
} as const;

export type FundId = keyof typeof FUNDS;

export const FUND_ORDER: FundId[] = [
  "community",
  "ecosystem",
  "treasury",
  "contributors",
  "liquidity",
  "mediation",
  "insurance",
  "genesisAirdrop",
];

export function fundUnits(id: FundId): bigint {
  return FUNDS[id].amount * UNITS_PER_TOKEN;
}

export function assertGenesisInvariant(): void {
  let bps = 0;
  let amount = 0n;
  for (const id of FUND_ORDER) {
    bps += FUNDS[id].bps;
    amount += FUNDS[id].amount;
  }
  if (bps !== 10000) throw new Error(`fund bps ${bps} != 10000`);
  if (amount !== TOTAL_SUPPLY) throw new Error(`fund sum ${amount} != ${TOTAL_SUPPLY}`);
}

assertGenesisInvariant();

/** Referral is one level, paid only from the community fund, with a monthly cap. */
export const REFERRAL = {
  depth: 1,
  referrerBps: 7000,
  refereeBps: 2000,
  antisibilBps: 1000,
  /** Per qualified referral, from the community fund. */
  payoutTokens: 100n,
  /** Max tokens a single referrer can earn in a rolling 30-day window. */
  monthlyCapTokens: 10_000n,
} as const;

export const FAMILY_AIRDROP_TOKENS = 25n;

export function tokensToUnits(tokens: bigint): bigint {
  return tokens * UNITS_PER_TOKEN;
}

export function unitsToTokens(units: bigint): { whole: bigint; frac: number } {
  const whole = units / UNITS_PER_TOKEN;
  const frac = Number(units % UNITS_PER_TOKEN);
  return { whole, frac };
}

export function parseAmountToUnits(input: string): bigint | null {
  const t = input.trim().replace(",", ".");
  if (!t || !/^\d+(\.\d{0,6})?$/.test(t)) return null;
  const [w, f = ""] = t.split(".");
  const frac = (f + "000000").slice(0, 6);
  try {
    return BigInt(w) * UNITS_PER_TOKEN + BigInt(frac);
  } catch {
    return null;
  }
}

export function formatUnits(units: bigint, fractionDigits = 2): string {
  const neg = units < 0n;
  const abs = neg ? -units : units;
  const whole = abs / UNITS_PER_TOKEN;
  const frac = abs % UNITS_PER_TOKEN;
  const fracStr = frac.toString().padStart(6, "0").slice(0, fractionDigits);
  const wholeStr = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0");
  if (fractionDigits === 0) return `${neg ? "-" : ""}${wholeStr}`;
  return `${neg ? "-" : ""}${wholeStr}.${fracStr}`;
}

export function shareOfPayout(totalUnits: bigint, bps: number): bigint {
  return (totalUnits * BigInt(bps)) / 10000n;
}
