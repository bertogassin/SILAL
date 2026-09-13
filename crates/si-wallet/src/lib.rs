//! Si Wallet. Seed never logged. No admin seizure.

use si_crypto::{generate_mnemonic, keypair_from_mnemonic, CryptoError, Keypair};
use si_tokenomics::TOTAL_UNITS;
use std::collections::HashMap;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum WalletError {
    #[error(transparent)]
    Crypto(#[from] CryptoError),
    #[error("insufficient funds")]
    Funds,
    #[error("idempotent")]
    Duplicate,
    #[error("negative rejected")]
    Negative,
}

#[derive(Clone, Debug)]
pub struct Tx {
    pub id: String,
    pub from: String,
    pub to: String,
    pub amount: u128,
}

#[derive(Default)]
pub struct Ledger {
    pub balances: HashMap<String, u128>,
    pub burned: u128,
    pub seen: HashMap<String, ()>,
}

impl Ledger {
    pub fn conservation_ok(&self) -> bool {
        let sum: u128 = self.balances.values().copied().sum();
        sum + self.burned == TOTAL_UNITS
    }

    pub fn transfer(&mut self, tx: Tx) -> Result<(), WalletError> {
        if tx.amount == 0 {
            return Err(WalletError::Negative);
        }
        if self.seen.contains_key(&tx.id) {
            return Ok(());
        }
        let from = self.balances.get(&tx.from).copied().unwrap_or(0);
        if from < tx.amount {
            return Err(WalletError::Funds);
        }
        self.balances.insert(tx.from.clone(), from - tx.amount);
        let to = self.balances.get(&tx.to).copied().unwrap_or(0);
        self.balances.insert(tx.to.clone(), to + tx.amount);
        self.seen.insert(tx.id.clone(), ());
        debug_assert!(self.conservation_ok() || self.balances.is_empty());
        Ok(())
    }
}

pub fn new_wallet() -> Result<(String, Keypair), WalletError> {
    let mnemonic = generate_mnemonic()?;
    let kp = keypair_from_mnemonic(&mnemonic)?;
    Ok((mnemonic, kp))
}
