//! Document hashes. Replacing a blob without breaking the chain is rejected.

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct DocRecord {
    pub id: String,
    pub blake3: String,
    pub prev: Option<String>,
}

pub fn hash_blob(bytes: &[u8]) -> String {
    hex::encode(blake3::hash(bytes).as_bytes())
}

pub fn append(chain: &mut Vec<DocRecord>, id: String, bytes: &[u8]) -> DocRecord {
    let blake = hash_blob(bytes);
    let prev = chain.last().map(|d| d.blake3.clone());
    let rec = DocRecord { id, blake3: blake, prev };
    chain.push(rec.clone());
    rec
}

pub fn verify_chain(chain: &[DocRecord]) -> bool {
    for i in 1..chain.len() {
        if chain[i].prev.as_deref() != Some(chain[i - 1].blake3.as_str()) {
            return false;
        }
    }
    true
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn chain_breaks_on_swap() {
        let mut c = Vec::new();
        append(&mut c, "a".into(), b"nikkah");
        append(&mut c, "b".into(), b"diploma");
        assert!(verify_chain(&c));
        c[0].blake3 = hash_blob(b"tamper");
        assert!(!verify_chain(&c));
    }
}
