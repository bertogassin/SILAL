//! Silsila graph. BlockedByPolicy is a family warning, never a state ban.

use std::collections::{HashMap, HashSet, VecDeque};
use thiserror::Error;

pub const DEFAULT_PATERNAL_GENS: u8 = 9;
pub const DEFAULT_MATERNAL_GENS: u8 = 5;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum EdgeType {
    Parent,
    Adoptive,
    Spouse,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Edge {
    pub kind: EdgeType,
    pub from: String,
    pub to: String,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Gender {
    Male,
    Female,
    Unspecified,
}

#[derive(Clone, Debug)]
pub struct Person {
    pub id: String,
    pub name: String,
    pub gender: Gender,
    pub living: bool,
    pub consent_to_publish: bool,
}

#[derive(Debug, Error)]
pub enum GraphError {
    #[error("edge type not allowed")]
    BadType,
    #[error("self edge")]
    SelfEdge,
    #[error("cycle")]
    Cycle,
    #[error("missing person")]
    Missing,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum KinshipKind {
    Allowed,
    Warning,
    BlockedByPolicy,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct KinshipResult {
    pub kind: KinshipKind,
    pub reason: &'static str,
    /// Always false. Family policy is not a court.
    pub is_state_ban: bool,
}

pub fn would_cycle(edges: &[Edge], next: &Edge) -> bool {
    if matches!(next.kind, EdgeType::Spouse) {
        return false;
    }
    if next.from == next.to {
        return true;
    }
    let mut stack = vec![next.to.as_str()];
    let mut seen = HashSet::new();
    while let Some(n) = stack.pop() {
        if n == next.from {
            return true;
        }
        if !seen.insert(n) {
            continue;
        }
        for e in edges {
            if matches!(e.kind, EdgeType::Parent | EdgeType::Adoptive) && e.from == n {
                stack.push(e.to.as_str());
            }
        }
    }
    false
}

pub fn add_edge(people: &[Person], edges: &mut Vec<Edge>, edge: Edge) -> Result<(), GraphError> {
    if edge.from == edge.to {
        return Err(GraphError::SelfEdge);
    }
    if !people.iter().any(|p| p.id == edge.from) || !people.iter().any(|p| p.id == edge.to) {
        return Err(GraphError::Missing);
    }
    if would_cycle(edges, &edge) {
        return Err(GraphError::Cycle);
    }
    edges.push(edge);
    Ok(())
}

fn parents<'a>(id: &str, edges: &'a [Edge]) -> Vec<&'a Edge> {
    edges
        .iter()
        .filter(|e| matches!(e.kind, EdgeType::Parent | EdgeType::Adoptive) && e.to == id)
        .collect()
}

fn father<'a>(id: &str, edges: &'a [Edge], people: &'a [Person]) -> Option<&'a str> {
    let ps = parents(id, edges);
    ps.iter()
        .find(|e| {
            people
                .iter()
                .any(|p| p.id == e.from && p.gender == Gender::Male)
        })
        .or(ps.first())
        .map(|e| e.from.as_str())
}

fn mother<'a>(id: &str, edges: &'a [Edge], people: &'a [Person]) -> Option<&'a str> {
    let ps = parents(id, edges);
    ps.iter()
        .find(|e| {
            people
                .iter()
                .any(|p| p.id == e.from && p.gender == Gender::Female)
        })
        .or(ps.first())
        .map(|e| e.from.as_str())
}

fn chain(id: &str, edges: &[Edge], people: &[Person], max: u8, via_father: bool) -> Vec<String> {
    let mut out = Vec::new();
    let mut cur = Some(id);
    let mut seen = HashSet::new();
    for _ in 0..max {
        let n = match cur {
            Some(v) => v,
            None => break,
        };
        let nxt = if via_father {
            father(n, edges, people)
        } else {
            mother(n, edges, people)
        };
        match nxt {
            Some(p) if seen.insert(p.to_string()) => {
                out.push(p.to_string());
                cur = Some(p);
            }
            _ => break,
        }
    }
    out
}

fn first_common(a: &[String], b: &[String]) -> bool {
    let set: HashSet<&str> = b.iter().map(|s| s.as_str()).collect();
    a.iter().any(|x| set.contains(x.as_str()))
}

fn siblings(id: &str, edges: &[Edge]) -> HashSet<String> {
    let mut out = HashSet::new();
    for p in parents(id, edges) {
        for e in edges {
            if matches!(e.kind, EdgeType::Parent | EdgeType::Adoptive)
                && e.from == p.from
                && e.to != id
            {
                out.insert(e.to.clone());
            }
        }
    }
    out
}

pub fn kinship_check(people: &[Person], edges: &[Edge], a: &str, b: &str) -> KinshipResult {
    if a == b {
        return KinshipResult {
            kind: KinshipKind::BlockedByPolicy,
            reason: "same person",
            is_state_ban: false,
        };
    }
    if parents(a, edges).iter().any(|e| e.from == b)
        || parents(b, edges).iter().any(|e| e.from == a)
    {
        return KinshipResult {
            kind: KinshipKind::BlockedByPolicy,
            reason: "parent-child",
            is_state_ban: false,
        };
    }
    if siblings(a, edges).contains(b) {
        return KinshipResult {
            kind: KinshipKind::BlockedByPolicy,
            reason: "siblings",
            is_state_ban: false,
        };
    }
    let pat_a = chain(a, edges, people, DEFAULT_PATERNAL_GENS, true);
    let pat_b = chain(b, edges, people, DEFAULT_PATERNAL_GENS, true);
    if first_common(&pat_a, &pat_b) {
        return KinshipResult {
            kind: KinshipKind::BlockedByPolicy,
            reason: "paternal ancestor within 9",
            is_state_ban: false,
        };
    }
    let mat_a = chain(a, edges, people, DEFAULT_MATERNAL_GENS, false);
    let mat_b = chain(b, edges, people, DEFAULT_MATERNAL_GENS, false);
    if first_common(&mat_a, &mat_b) {
        return KinshipResult {
            kind: KinshipKind::BlockedByPolicy,
            reason: "maternal ancestor within 5",
            is_state_ban: false,
        };
    }
    let _ = VecDeque::<&str>::new();
    let _ = HashMap::<&str, u8>::new();
    KinshipResult {
        kind: KinshipKind::Allowed,
        reason: "no close kinship",
        is_state_ban: false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn p(id: &str, g: Gender) -> Person {
        Person {
            id: id.into(),
            name: id.into(),
            gender: g,
            living: true,
            consent_to_publish: true,
        }
    }

    #[test]
    fn rejects_cycle() {
        let people = vec![p("a", Gender::Male), p("b", Gender::Male)];
        let mut edges = vec![Edge {
            kind: EdgeType::Parent,
            from: "a".into(),
            to: "b".into(),
        }];
        let err = add_edge(
            &people,
            &mut edges,
            Edge {
                kind: EdgeType::Parent,
                from: "b".into(),
                to: "a".into(),
            },
        );
        assert!(matches!(err, Err(GraphError::Cycle)));
    }

    #[test]
    fn paternal_cousins_blocked() {
        let people = vec![
            p("gf", Gender::Male),
            p("f", Gender::Male),
            p("u", Gender::Male),
            p("a", Gender::Male),
            p("c", Gender::Male),
        ];
        let edges = vec![
            Edge {
                kind: EdgeType::Parent,
                from: "gf".into(),
                to: "f".into(),
            },
            Edge {
                kind: EdgeType::Parent,
                from: "gf".into(),
                to: "u".into(),
            },
            Edge {
                kind: EdgeType::Parent,
                from: "f".into(),
                to: "a".into(),
            },
            Edge {
                kind: EdgeType::Parent,
                from: "u".into(),
                to: "c".into(),
            },
        ];
        let r = kinship_check(&people, &edges, "a", "c");
        assert_eq!(r.kind, KinshipKind::BlockedByPolicy);
        assert!(!r.is_state_ban);
    }

    #[test]
    fn unrelated_allowed() {
        let people = vec![p("a", Gender::Male), p("b", Gender::Female)];
        let r = kinship_check(&people, &[], "a", "b");
        assert_eq!(r.kind, KinshipKind::Allowed);
    }
}
