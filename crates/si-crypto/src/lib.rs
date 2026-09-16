//! Classic provider: Ed25519, X25519, BLAKE3, XChaCha20-Poly1305, Argon2id.
//! Hybrid (Ed25519 + ML-DSA-65) and PQ (ML-KEM-768, SLH-DSA) are reserved
//! as `CryptoProvider` variants. They are not enabled in v0.1.

use argon2::{
    password_hash::{PasswordHasher, SaltString},
    Argon2,
};
use bip39::{Language, Mnemonic};
use chacha20poly1305::{
    aead::{Aead, KeyInit},
    XChaCha20Poly1305, XNonce,
};
use ed25519_dalek::{Signature, Signer, SigningKey, Verifier, VerifyingKey};
use rand::rngs::OsRng;
use rand::RngCore;
use thiserror::Error;
use x25519_dalek::{PublicKey as XPublic, StaticSecret};
use zeroize::Zeroize;

pub const ADDR_HRP: &str = "si1";

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum CryptoProvider {
    Classic,
    Hybrid,
    PostQuantum,
}

pub const ACTIVE: CryptoProvider = CryptoProvider::Classic;

#[derive(Debug, Error)]
pub enum CryptoError {
    #[error("mnemonic")]
    Mnemonic,
    #[error("aead")]
    Aead,
    #[error("kdf")]
    Kdf,
    #[error("key")]
    Key,
}

pub fn blake3_hex(data: &[u8]) -> String {
    hex::encode(blake3::hash(data).as_bytes())
}

pub fn generate_mnemonic() -> String {
    let mut entropy = [0u8; 16];
    OsRng.fill_bytes(&mut entropy);
    let m = Mnemonic::from_entropy_in(Language::English, &entropy).expect("entropy");
    m.to_string()
}

pub fn mnemonic_valid(phrase: &str) -> bool {
    Mnemonic::parse_in_normalized(Language::English, phrase).is_ok()
}

pub struct Keypair {
    pub signing: SigningKey,
    pub address: String,
}

impl Drop for Keypair {
    fn drop(&mut self) {
        let mut bytes = self.signing.to_bytes();
        bytes.zeroize();
    }
}

pub fn keypair_from_mnemonic(phrase: &str) -> Result<Keypair, CryptoError> {
    let m = Mnemonic::parse_in_normalized(Language::English, phrase).map_err(|_| CryptoError::Mnemonic)?;
    let seed = m.to_seed("");
    let mut sk_bytes = [0u8; 32];
    sk_bytes.copy_from_slice(&seed[..32]);
    let signing = SigningKey::from_bytes(&sk_bytes);
    sk_bytes.zeroize();
    let vk = signing.verifying_key();
    let address = address_from_pubkey(vk.as_bytes());
    Ok(Keypair { signing, address })
}

pub fn address_from_pubkey(pk: &[u8]) -> String {
    let h = blake3::hash(pk);
    format!("{ADDR_HRP}{}", hex::encode(&h.as_bytes()[..16]))
}

pub fn sign(kp: &Keypair, msg: &[u8]) -> [u8; 64] {
    kp.signing.sign(msg).to_bytes()
}

pub fn verify(pk: &[u8; 32], msg: &[u8], sig: &[u8; 64]) -> Result<bool, CryptoError> {
    let vk = VerifyingKey::from_bytes(pk).map_err(|_| CryptoError::Key)?;
    Ok(vk.verify(msg, &Signature::from_bytes(sig)).is_ok())
}

pub fn x25519_public(secret: &[u8; 32]) -> [u8; 32] {
    let sk = StaticSecret::from(*secret);
    XPublic::from(&sk).to_bytes()
}

pub fn seal(password: &str, plaintext: &[u8]) -> Result<Vec<u8>, CryptoError> {
    let salt = SaltString::generate(&mut OsRng);
    let argon = Argon2::default();
    let hash = argon
        .hash_password(password.as_bytes(), &salt)
        .map_err(|_| CryptoError::Kdf)?;
    let Some(hash_bytes) = hash.hash else {
        return Err(CryptoError::Kdf);
    };
    let mut key = [0u8; 32];
    let raw = hash_bytes.as_bytes();
    let n = raw.len().min(32);
    key[..n].copy_from_slice(&raw[..n]);
    let cipher = XChaCha20Poly1305::new_from_slice(&key).map_err(|_| CryptoError::Aead)?;
    key.zeroize();
    let mut nonce_bytes = [0u8; 24];
    OsRng.fill_bytes(&mut nonce_bytes);
    let nonce = XNonce::from_slice(&nonce_bytes);
    let mut ct = cipher.encrypt(nonce, plaintext).map_err(|_| CryptoError::Aead)?;
    let mut out = salt.as_str().as_bytes().to_vec();
    out.push(0);
    out.extend_from_slice(&nonce_bytes);
    out.append(&mut ct);
    Ok(out)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn mnemonic_roundtrip_address() {
        let m = generate_mnemonic();
        assert!(mnemonic_valid(&m));
        let a = keypair_from_mnemonic(&m).unwrap();
        let b = keypair_from_mnemonic(&m).unwrap();
        assert_eq!(a.address, b.address);
        assert!(a.address.starts_with("si1"));
        let msg = b"si kinship assertion";
        let sig = sign(&a, msg);
        let pk = a.signing.verifying_key().to_bytes();
        assert!(verify(&pk, msg, &sig).unwrap());
    }
}
