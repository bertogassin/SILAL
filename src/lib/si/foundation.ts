/**
 * Load-bearing frame. A future bank or insurer plugs in here.
 * They do not replace supply, ledger conservation, or these flags.
 */
import { protocolAddress } from "./crypto";
import { TOTAL_SUPPLY } from "./tokenomics";

export const FOUNDATION = {
  product: "si",
  supply: TOTAL_SUPPLY,
  mintAfterGenesis: false,
  referralDepth: 1,
  /** Qard hasan. Interest is not a field and not a parameter. */
  interestBps: 0,
  insuranceAutoPay: false,
  licensedBank: false,
  licensedInsurer: false,
  yieldProduct: false,
  /** This frame is not a draft to throw away. */
  replaceable: false,
} as const;

export function potAddress(id: string): string {
  return protocolAddress(`bank:pot:${id}`);
}

export function assertFoundation(): void {
  if (FOUNDATION.mintAfterGenesis) throw new Error("no post-genesis mint");
  if (FOUNDATION.interestBps !== 0) throw new Error("no riba");
  if (FOUNDATION.insuranceAutoPay) throw new Error("no auto insurance pay");
  if (FOUNDATION.yieldProduct) throw new Error("not yield");
  if (FOUNDATION.replaceable) throw new Error("frame is load-bearing");
  if (FOUNDATION.supply !== 10_000_000_000n) throw new Error("supply");
}

assertFoundation();
