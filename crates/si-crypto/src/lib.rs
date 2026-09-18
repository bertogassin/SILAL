//! Classic provider: Ed25519, X25519, BLAKE3, XChaCha20-Poly1305, Argon2id.
//! Hybrid (Ed25519 + ML-DSA-65) and PQ (ML-KEM-768, SLH-DSA) are reserved
//! as `CryptoProvider` variants. They are not enabled in v0.1.

use argon2::{
    password_hash::{Salt, SaltString},
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
use zeroize::{Zeroize, ZeroizeOnDrop, Zeroizing};

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
    let mut entropy = Zeroizing::new([0u8; 16]);
    OsRng.fill_bytes(&mut *entropy);
    let m = Mnemonic::from_entropy_in(Language::English, &*entropy).expect("entropy");
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
        // `SigningKey` zeroizes its own secret scalar on drop, but only under
        // `#[cfg(feature = "zeroize")]` on ed25519-dalek's side (see its
        // `signing.rs`) -- a feature we currently pull in only via default
        // features, not by naming it ourselves. Without it, `SigningKey` has
        // *no* `Drop` impl at all and the secret leaks in freed memory. We
        // cannot reach into its private fields to zero them ourselves, so
        // instead this ties that guarantee to compilation: if the feature is
        // ever lost, `T: ZeroizeOnDrop` stops holding and every build of this
        // crate fails here, instead of silently shipping an unwiped key.
        fn require_zeroize_on_drop<T: ZeroizeOnDrop>() {}
        require_zeroize_on_drop::<SigningKey>();
    }
}

pub fn keypair_from_mnemonic(phrase: &str) -> Result<Keypair, CryptoError> {
    let m = Mnemonic::parse_in_normalized(Language::English, phrase)
        .map_err(|_| CryptoError::Mnemonic)?;
    let seed = Zeroizing::new(m.to_seed(""));
    let mut sk_bytes = Zeroizing::new([0u8; 32]);
    sk_bytes.copy_from_slice(&seed[..32]);
    let signing = SigningKey::from_bytes(&sk_bytes);
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
    // Unlike `SigningKey`, x25519-dalek's `StaticSecret` only derives
    // `Zeroize`, never `ZeroizeOnDrop` (see its `x25519.rs`: "downstream
    // consumers may derive it for Drop ... it does NOT ensure this itself").
    // Dropping `sk` without calling `.zeroize()` would leave this copy of the
    // secret sitting unwiped in freed memory. The bound below also fails to
    // compile if a future x25519-dalek version drops even plain `Zeroize`.
    fn require_zeroize<T: Zeroize>() {}
    require_zeroize::<StaticSecret>();

    let mut sk = StaticSecret::from(*secret);
    let pk = XPublic::from(&sk).to_bytes();
    sk.zeroize();
    pk
}

pub fn seal(password: &str, plaintext: &[u8]) -> Result<Vec<u8>, CryptoError> {
    let salt = SaltString::generate(&mut OsRng);
    let argon = Argon2::default();
    // `PasswordHasher::hash_password` returns the derived key inside a
    // `password_hash::Output`, which implements neither `Zeroize` nor `Drop`
    // -- copying it out (as the old code did) still leaves the original
    // sitting unwiped in memory. `hash_password_into` writes the key
    // straight into a buffer we own and can zeroize, with no such copy.
    let mut salt_buf = [0u8; Salt::MAX_LENGTH];
    let salt_bytes = salt
        .decode_b64(&mut salt_buf)
        .map_err(|_| CryptoError::Kdf)?;
    let mut key = Zeroizing::new([0u8; 32]);
    argon
        .hash_password_into(password.as_bytes(), salt_bytes, key.as_mut())
        .map_err(|_| CryptoError::Kdf)?;
    let cipher = XChaCha20Poly1305::new_from_slice(key.as_ref()).map_err(|_| CryptoError::Aead)?;
    drop(key);
    let mut nonce_bytes = [0u8; 24];
    OsRng.fill_bytes(&mut nonce_bytes);
    let nonce = XNonce::from_slice(&nonce_bytes);
    let mut ct = cipher
        .encrypt(nonce, plaintext)
        .map_err(|_| CryptoError::Aead)?;
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
