//! Deep links. The server is dumb: invites, events, ciphertext relay.

use thiserror::Error;

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Invite {
    Referral(String),
    Circle(String),
    Event(String),
}

#[derive(Debug, Error)]
#[error("bad invite")]
pub struct ParseError;

pub fn parse_invite(raw: &str) -> Result<Invite, ParseError> {
    let t = raw.trim();
    if let Some(rest) = t.strip_prefix("si://r/") {
        return Ok(Invite::Referral(rest.to_uppercase()));
    }
    if let Some(rest) = t.strip_prefix("si://c/") {
        return Ok(Invite::Circle(rest.to_uppercase()));
    }
    if let Some(rest) = t.strip_prefix("si://e/") {
        return Ok(Invite::Event(rest.to_uppercase()));
    }
    if t.to_uppercase().starts_with("SI-") {
        return Ok(Invite::Referral(t.to_uppercase()));
    }
    Err(ParseError)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_ref() {
        assert_eq!(
            parse_invite("si://r/SI-ROOT").unwrap(),
            Invite::Referral("SI-ROOT".into())
        );
    }
}
