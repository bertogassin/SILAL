//! Domain names. Chechen entities keep their names.

pub use si_tokenomics;

pub const APP_NAME: &str = "si";
pub const WALLET_NAME: &str = "Si Wallet";
pub const CHAIN_DEV_NAME: &str = "Si Chain";

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Locale {
    Ce,
    Ru,
    En,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum CryptoProvider {
    Classic,
    Hybrid,
    PostQuantum,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum AddressVersion {
    V1Ed25519 = 1,
    V2Hybrid = 2,
    V3PostQuantum = 3,
}
