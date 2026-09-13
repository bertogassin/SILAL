//! SILAL genesis. There is no post-genesis mint.

pub const TICKER: &str = "SILAL";
pub const TOTAL_SUPPLY: u64 = 10_000_000_000;
pub const DECIMALS: u32 = 6;
pub const UNITS_PER_TOKEN: u64 = 1_000_000;
pub const TOTAL_UNITS: u128 = (TOTAL_SUPPLY as u128) * (UNITS_PER_TOKEN as u128);
pub const SLIP44_SILAL: u32 = 549;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Fund {
    pub id: &'static str,
    pub bps: u16,
    pub amount: u64,
    pub rule: &'static str,
}

pub const FUNDS: [Fund; 8] = [
    Fund {
        id: "community",
        bps: 3000,
        amount: 3_000_000_000,
        rule: "vesting + anti-sybil",
    },
    Fund {
        id: "ecosystem",
        bps: 2000,
        amount: 2_000_000_000,
        rule: "grants / events, multi-sig",
    },
    Fund {
        id: "treasury",
        bps: 1500,
        amount: 1_500_000_000,
        rule: "36m vesting, 6m cliff",
    },
    Fund {
        id: "contributors",
        bps: 1000,
        amount: 1_000_000_000,
        rule: "24m vesting, 6m cliff",
    },
    Fund {
        id: "liquidity",
        bps: 1000,
        amount: 1_000_000_000,
        rule: "partially locked",
    },
    Fund {
        id: "mediation",
        bps: 800,
        amount: 800_000_000,
        rule: "mediation and archive utility",
    },
    Fund {
        id: "insurance",
        bps: 400,
        amount: 400_000_000,
        rule: "incidents and bug bounty only",
    },
    Fund {
        id: "genesis_airdrop",
        bps: 300,
        amount: 300_000_000,
        rule: "verified families, not a dream sale",
    },
];

pub const REFERRAL_DEPTH: u8 = 1;
pub const REFERRAL_REFERRER_BPS: u16 = 7000;
pub const REFERRAL_REFEREE_BPS: u16 = 2000;
pub const REFERRAL_ANTISIBIL_BPS: u16 = 1000;
pub const REFERRAL_PAYOUT_TOKENS: u64 = 100;
pub const REFERRAL_MONTHLY_CAP_TOKENS: u64 = 10_000;

/// Load-bearing: a future bank does not add interest.
pub const BANK_INTEREST_BPS: u16 = 0;
/// Load-bearing: insurance never auto-pays from this crate.
pub const INSURANCE_AUTO_PAY: bool = false;
/// Load-bearing: this frame is not thrown away.
pub const FRAME_REPLACEABLE: bool = false;

pub fn genesis_bps() -> u16 {
    FUNDS.iter().map(|f| f.bps).sum()
}

pub fn genesis_amount() -> u64 {
    FUNDS.iter().map(|f| f.amount).sum()
}

pub fn share(total_units: u128, bps: u16) -> u128 {
    total_units * (bps as u128) / 10_000
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn funds_sum_to_ten_billion() {
        assert_eq!(genesis_bps(), 10_000);
        assert_eq!(genesis_amount(), TOTAL_SUPPLY);
        assert_eq!(TOTAL_UNITS, 10_000_000_000_000_000);
    }

    #[test]
    fn referral_is_one_level_and_splits_to_100() {
        assert_eq!(REFERRAL_DEPTH, 1);
        assert_eq!(
            REFERRAL_REFERRER_BPS + REFERRAL_REFEREE_BPS + REFERRAL_ANTISIBIL_BPS,
            10_000
        );
    }

    #[test]
    fn no_hidden_mint_constant() {
        // If this changes, the ethics doc must change with it.
        assert_eq!(TOTAL_SUPPLY, 10_000_000_000);
    }

    #[test]
    fn bank_and_insurance_plug_in_without_replacing_the_frame() {
        assert_eq!(BANK_INTEREST_BPS, 0);
        let insurance_auto_pay = INSURANCE_AUTO_PAY;
        let frame_replaceable = FRAME_REPLACEABLE;
        assert!(!insurance_auto_pay);
        assert!(!frame_replaceable);
    }
}
