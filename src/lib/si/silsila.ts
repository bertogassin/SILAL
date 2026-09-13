export type Gender = "m" | "f" | "x" | "unknown";
export type EdgeType = "parent" | "child" | "spouse" | "adoptive";

export interface Person {
  id: string;
  name: string;
  gender: Gender;
  living: boolean;
  consentToPublish: boolean;
  isSelf?: boolean;
  isMinor?: boolean;
  birthYear?: number;
  deathYear?: number;
  taip?: string;
  walletAddress?: string;
  hidden?: boolean;
  notes?: string;
  createdAt: number;
}

export interface KinEdge {
  id: string;
  type: EdgeType;
  /** Canonical: parent/adoptive from = parent, to = child. Spouse undirected. */
  from: string;
  to: string;
  createdAt: number;
}

export type KinshipKind = "Allowed" | "Warning" | "BlockedByPolicy";

export interface KinshipResult {
  kind: KinshipKind;
  reason: string;
  reasonKey: string;
  paternalCommon?: { id: string; genA: number; genB: number };
  maternalCommon?: { id: string; genA: number; genB: number };
  relationLabel?: string;
  /** Blocked is a family-policy warning, never a state ban. */
  isStateBan: false;
}

export const DEFAULT_PATERNAL_GENS = 9;
export const DEFAULT_MATERNAL_GENS = 5;

const ALLOWED_EDGE_TYPES: EdgeType[] = ["parent", "child", "spouse", "adoptive"];

export function canonicalEdge(
  type: EdgeType,
  from: string,
  to: string,
): { type: EdgeType; from: string; to: string } {
  if (type === "child") return { type: "parent", from: to, to: from };
  if (type === "spouse") {
    return from < to ? { type, from, to } : { type, from: to, to: from };
  }
  return { type, from, to };
}

export function parentsOf(id: string, edges: KinEdge[]): KinEdge[] {
  return edges.filter((e) => (e.type === "parent" || e.type === "adoptive") && e.to === id);
}

export function childrenOf(id: string, edges: KinEdge[]): KinEdge[] {
  return edges.filter((e) => (e.type === "parent" || e.type === "adoptive") && e.from === id);
}

export function spousesOf(id: string, edges: KinEdge[]): string[] {
  return edges
    .filter((e) => e.type === "spouse" && (e.from === id || e.to === id))
    .map((e) => (e.from === id ? e.to : e.from));
}

function personMap(people: Person[]): Map<string, Person> {
  return new Map(people.map((p) => [p.id, p]));
}

/** Walk parent links. Returns ancestor id → shortest generation (1 = parent). */
export function ancestors(
  id: string,
  edges: KinEdge[],
  maxGen = 16,
): Map<string, { gen: number; via: "father" | "mother" | "other" }> {
  const out = new Map<string, { gen: number; via: "father" | "mother" | "other" }>();
  const q: Array<{ id: string; gen: number; via: "father" | "mother" | "other" }> = [
    { id, gen: 0, via: "other" },
  ];
  const seen = new Set<string>([id]);
  while (q.length) {
    const cur = q.shift()!;
    if (cur.gen >= maxGen) continue;
    for (const e of parentsOf(cur.id, edges)) {
      if (seen.has(e.from)) continue;
      seen.add(e.from);
      const nextGen = cur.gen + 1;
      const via = cur.gen === 0 ? "other" : cur.via;
      out.set(e.from, { gen: nextGen, via });
      q.push({ id: e.from, gen: nextGen, via });
    }
  }
  return out;
}

function fatherOf(id: string, edges: KinEdge[], people: Map<string, Person>): string | undefined {
  const ps = parentsOf(id, edges);
  const fathers = ps.filter((e) => people.get(e.from)?.gender === "m");
  return (fathers[0] ?? ps.find((e) => people.get(e.from)?.gender !== "f"))?.from;
}

function motherOf(id: string, edges: KinEdge[], people: Map<string, Person>): string | undefined {
  const ps = parentsOf(id, edges);
  const mothers = ps.filter((e) => people.get(e.from)?.gender === "f");
  return (mothers[0] ?? ps.find((e) => people.get(e.from)?.gender !== "m"))?.from;
}

/** Strict paternal chain: father, father's father, … */
export function paternalChain(
  id: string,
  edges: KinEdge[],
  people: Person[],
  maxGen = DEFAULT_PATERNAL_GENS,
): string[] {
  const map = personMap(people);
  const chain: string[] = [];
  let cur: string | undefined = id;
  const seen = new Set<string>();
  for (let i = 0; i < maxGen; i++) {
    if (!cur) break;
    const f = fatherOf(cur, edges, map);
    if (!f || seen.has(f)) break;
    seen.add(f);
    chain.push(f);
    cur = f;
  }
  return chain;
}

export function maternalChain(
  id: string,
  edges: KinEdge[],
  people: Person[],
  maxGen = DEFAULT_MATERNAL_GENS,
): string[] {
  const map = personMap(people);
  const chain: string[] = [];
  let cur: string | undefined = id;
  const seen = new Set<string>();
  for (let i = 0; i < maxGen; i++) {
    if (!cur) break;
    const m = motherOf(cur, edges, map);
    if (!m || seen.has(m)) break;
    seen.add(m);
    chain.push(m);
    cur = m;
  }
  return chain;
}

export function hasCycleIfAdded(
  edges: KinEdge[],
  next: { type: EdgeType; from: string; to: string },
): boolean {
  const c = canonicalEdge(next.type, next.from, next.to);
  if (c.type === "spouse") return false;
  if (c.from === c.to) return true;
  // parent from → to (from is parent of to). Cycle if `from` is already descendant of `to`.
  const desc = new Set<string>();
  const stack = [c.to];
  while (stack.length) {
    const n = stack.pop()!;
    if (n === c.from) return true;
    if (desc.has(n)) continue;
    desc.add(n);
    for (const e of childrenOf(n, edges)) stack.push(e.to);
  }
  return false;
}

export function canAddEdge(
  people: Person[],
  edges: KinEdge[],
  type: EdgeType,
  from: string,
  to: string,
): { ok: true; edge: Omit<KinEdge, "id" | "createdAt"> } | { ok: false; errorKey: string } {
  if (!ALLOWED_EDGE_TYPES.includes(type)) return { ok: false, errorKey: "silsila.badEdge" };
  if (from === to) return { ok: false, errorKey: "silsila.selfEdge" };
  if (!people.some((p) => p.id === from) || !people.some((p) => p.id === to)) {
    return { ok: false, errorKey: "silsila.missingPerson" };
  }
  const c = canonicalEdge(type, from, to);
  if (hasCycleIfAdded(edges, c)) return { ok: false, errorKey: "silsila.cycle" };
  const exists = edges.some(
    (e) => e.type === c.type && e.from === c.from && e.to === c.to,
  );
  if (exists) return { ok: false, errorKey: "silsila.dupEdge" };
  return { ok: true, edge: c };
}

function firstCommon(
  chainA: string[],
  chainB: string[],
): { id: string; genA: number; genB: number } | undefined {
  const idxB = new Map(chainB.map((id, i) => [id, i + 1]));
  for (let i = 0; i < chainA.length; i++) {
    const genB = idxB.get(chainA[i]);
    if (genB !== undefined) return { id: chainA[i], genA: i + 1, genB };
  }
  return undefined;
}

function siblings(id: string, edges: KinEdge[]): Set<string> {
  const out = new Set<string>();
  for (const p of parentsOf(id, edges)) {
    for (const c of childrenOf(p.from, edges)) {
      if (c.to !== id) out.add(c.to);
    }
  }
  return out;
}

function isParentChild(a: string, b: string, edges: KinEdge[]): boolean {
  return parentsOf(a, edges).some((e) => e.from === b) || parentsOf(b, edges).some((e) => e.from === a);
}

export function kinshipCheck(
  people: Person[],
  edges: KinEdge[],
  a: string,
  b: string,
  opts?: { paternalGens?: number; maternalGens?: number },
): KinshipResult {
  const n = opts?.paternalGens ?? DEFAULT_PATERNAL_GENS;
  const m = opts?.maternalGens ?? DEFAULT_MATERNAL_GENS;
  const map = personMap(people);
  const pa = map.get(a);
  const pb = map.get(b);
  if (!pa || !pb) {
    return {
      kind: "Warning",
      reason: "Unknown person",
      reasonKey: "silsila.missingPerson",
      isStateBan: false,
    };
  }
  if (a === b) {
    return {
      kind: "BlockedByPolicy",
      reason: "Same person",
      reasonKey: "silsila.samePerson",
      relationLabel: "self",
      isStateBan: false,
    };
  }
  if (spousesOf(a, edges).includes(b)) {
    return {
      kind: "Allowed",
      reason: "Already spouses",
      reasonKey: "silsila.alreadySpouses",
      relationLabel: "spouse",
      isStateBan: false,
    };
  }
  if (isParentChild(a, b, edges)) {
    return {
      kind: "BlockedByPolicy",
      reason: "Parent and child",
      reasonKey: "silsila.parentChild",
      relationLabel: "parent-child",
      isStateBan: false,
    };
  }
  if (siblings(a, edges).has(b)) {
    return {
      kind: "BlockedByPolicy",
      reason: "Siblings share a parent",
      reasonKey: "silsila.siblings",
      relationLabel: "sibling",
      isStateBan: false,
    };
  }

  // Aunt/uncle: a parent of A is a sibling of B, or vice versa
  const parentsA = parentsOf(a, edges).map((e) => e.from);
  const parentsB = parentsOf(b, edges).map((e) => e.from);
  for (const p of parentsA) {
    if (siblings(p, edges).has(b) || p === b) {
      return {
        kind: "BlockedByPolicy",
        reason: "Aunt, uncle, niece or nephew",
        reasonKey: "silsila.uncleNiece",
        relationLabel: "uncle-niece",
        isStateBan: false,
      };
    }
  }
  for (const p of parentsB) {
    if (siblings(p, edges).has(a) || p === a) {
      return {
        kind: "BlockedByPolicy",
        reason: "Aunt, uncle, niece or nephew",
        reasonKey: "silsila.uncleNiece",
        relationLabel: "uncle-niece",
        isStateBan: false,
      };
    }
  }

  const paternalA = paternalChain(a, edges, people, n);
  const paternalB = paternalChain(b, edges, people, n);
  const maternalA = maternalChain(a, edges, people, m);
  const maternalB = maternalChain(b, edges, people, m);
  const paternalCommon = firstCommon(paternalA, paternalB);
  const maternalCommon = firstCommon(maternalA, maternalB);

  if (paternalCommon) {
    return {
      kind: "BlockedByPolicy",
      reason: `Shared paternal ancestor within ${n} generations`,
      reasonKey: "silsila.paternalClose",
      paternalCommon,
      relationLabel: "paternal-kin",
      isStateBan: false,
    };
  }
  if (maternalCommon) {
    return {
      kind: "BlockedByPolicy",
      reason: `Shared maternal ancestor within ${m} generations`,
      reasonKey: "silsila.maternalClose",
      maternalCommon,
      relationLabel: "maternal-kin",
      isStateBan: false,
    };
  }

  const allA = ancestors(a, edges, Math.max(n, 12));
  const allB = ancestors(b, edges, Math.max(n, 12));
  for (const [id, ga] of allA) {
    const gb = allB.get(id);
    if (gb) {
      return {
        kind: "Warning",
        reason: "Related through a longer or mixed line",
        reasonKey: "silsila.distantKin",
        relationLabel: "distant-kin",
        isStateBan: false,
      };
    }
    void ga;
  }

  return {
    kind: "Allowed",
    reason: "No close kinship found in this tree",
    reasonKey: "silsila.allowed",
    isStateBan: false,
  };
}

export function toGedcom(people: Person[], edges: KinEdge[]): string {
  const lines: string[] = ["0 HEAD", "1 SOUR si", "1 GEDC", "2 VERS 5.5.1", "1 CHAR UTF-8"];
  const xref = new Map<string, string>();
  const visible = people.filter((p) => p.isSelf || !p.living || (p.consentToPublish && !p.hidden));
  const allowed = new Set(visible.map((p) => p.id));
  visible.forEach((p, i) => xref.set(p.id, `@I${i + 1}@`));
  for (const p of visible) {
    const x = xref.get(p.id)!;
    lines.push(`0 ${x} INDI`);
    lines.push(`1 NAME ${p.name.replace(/\//g, "")}`);
    if (p.gender === "m") lines.push("1 SEX M");
    if (p.gender === "f") lines.push("1 SEX F");
    if (p.birthYear) {
      lines.push("1 BIRT");
      lines.push(`2 DATE ${p.birthYear}`);
    }
    if (!p.living && p.deathYear) {
      lines.push("1 DEAT");
      lines.push(`2 DATE ${p.deathYear}`);
    }
  }
  let fam = 1;
  const parentPairs = new Map<string, string[]>();
  for (const p of visible) {
    const ps = parentsOf(p.id, edges).map((e) => e.from).filter((id) => allowed.has(id));
    if (!ps.length) continue;
    const key = ps.slice().sort().join("+");
    const arr = parentPairs.get(key) ?? [];
    arr.push(p.id);
    parentPairs.set(key, arr);
  }
  for (const [key, children] of parentPairs) {
    const parents = key.split("+");
    const x = `@F${fam++}@`;
    lines.push(`0 ${x} FAM`);
    for (const pid of parents) {
      const person = people.find((p) => p.id === pid);
      const tag = person?.gender === "f" ? "WIFE" : "HUSB";
      lines.push(`1 ${tag} ${xref.get(pid)}`);
    }
    for (const cid of children) {
      lines.push(`1 CHIL ${xref.get(cid)}`);
    }
  }
  for (const e of edges.filter((e) => e.type === "spouse" && allowed.has(e.from) && allowed.has(e.to))) {
    lines.push(`0 @F${fam++}@ FAM`);
    const a = people.find((p) => p.id === e.from);
    const b = people.find((p) => p.id === e.to);
    const husb = a?.gender === "f" ? e.to : e.from;
    const wife = husb === e.from ? e.to : e.from;
    lines.push(`1 HUSB ${xref.get(husb)}`);
    if (b || a) lines.push(`1 WIFE ${xref.get(wife)}`);
  }
  lines.push("0 TRLR");
  return lines.join("\n") + "\n";
}

export function fromGedcom(text: string, now = Date.now()): { people: Person[]; edges: KinEdge[] } {
  const indis = new Map<
    string,
    { name: string; gender: Gender; birthYear?: number; deathYear?: number }
  >();
  const fams: { husb?: string; wife?: string; chil: string[] }[] = [];
  let curI: string | null = null;
  let curF: { husb?: string; wife?: string; chil: string[] } | null = null;
  let lastTag = "";
  for (const raw of text.split(/\r?\n/)) {
    const m = raw.match(/^(\d+)\s+(?:(@[^@]+@)\s+)?(\S+)(?:\s+(.*))?$/);
    if (!m) continue;
    const level = Number(m[1]);
    const xref = m[2];
    const tag = m[3];
    const rest = (m[4] ?? "").trim();
    if (level === 0) {
      if (curF) fams.push(curF);
      curF = null;
      curI = null;
      const isIndi = tag === "INDI" || rest === "INDI";
      const isFam = tag === "FAM" || rest === "FAM";
      if (isIndi && xref) {
        curI = xref;
        indis.set(xref, { name: "—", gender: "unknown" });
      } else if (isFam) {
        curF = { chil: [] };
      }
      lastTag = tag;
      continue;
    }
    if (curI && indis.has(curI)) {
      const p = indis.get(curI)!;
      if (tag === "NAME") p.name = rest.replace(/\//g, " ").replace(/\s+/g, " ").trim() || p.name;
      if (tag === "SEX") p.gender = rest.startsWith("M") ? "m" : rest.startsWith("F") ? "f" : "unknown";
      if (tag === "DATE" && lastTag === "BIRT") {
        const y = rest.match(/\d{4}/);
        if (y) p.birthYear = Number(y[0]);
      }
      if (tag === "DATE" && lastTag === "DEAT") {
        const y = rest.match(/\d{4}/);
        if (y) p.deathYear = Number(y[0]);
      }
      lastTag = tag;
    } else if (curF) {
      if (tag === "HUSB") curF.husb = rest;
      if (tag === "WIFE") curF.wife = rest;
      if (tag === "CHIL") curF.chil.push(rest);
    }
  }
  if (curF) fams.push(curF);

  const year = new Date(now).getFullYear();
  const idMap = new Map<string, string>();
  const people: Person[] = [];
  let n = 0;
  for (const [xref, raw] of indis) {
    const id = `ged-${++n}`;
    idMap.set(xref, id);
    const living = !raw.deathYear && (!raw.birthYear || year - raw.birthYear < 110);
    people.push({
      id,
      name: raw.name,
      gender: raw.gender,
      living,
      consentToPublish: !living,
      birthYear: raw.birthYear,
      deathYear: raw.deathYear,
      createdAt: now,
    });
  }
  const edges: KinEdge[] = [];
  let e = 0;
  const push = (type: EdgeType, from: string, to: string) => {
    if (!from || !to || from === to) return;
    edges.push({ id: `ge-${++e}`, type, from, to, createdAt: now });
  };
  for (const f of fams) {
    const husb = f.husb ? idMap.get(f.husb) : undefined;
    const wife = f.wife ? idMap.get(f.wife) : undefined;
    if (husb && wife) push("spouse", husb < wife ? husb : wife, husb < wife ? wife : husb);
    for (const c of f.chil) {
      const child = idMap.get(c);
      if (!child) continue;
      if (husb) push("parent", husb, child);
      if (wife) push("parent", wife, child);
    }
  }
  return { people, edges };
}

export const LEGACY_IMPORT_PERSON_IDS = ["p-ff", "p-fm", "p-mf", "p-mm", "p-f", "p-m", "p-uncle", "p-cousin"];

export function generationOf(
  id: string,
  selfId: string,
  edges: KinEdge[],
): number | null {
  if (id === selfId) return 0;
  const selfAncestorsOfId = ancestors(id, edges, 16);
  const selfAsAnc = selfAncestorsOfId.get(selfId);
  if (selfAsAnc) return selfAsAnc.gen;
  const idAsAnc = ancestors(selfId, edges, 16).get(id);
  if (idAsAnc) return -idAsAnc.gen;
  return null;
}

/** Anyone may be invited. Kinship is only the 9-generation walk. */
export function isKinWithin(
  a: string,
  b: string,
  edges: KinEdge[],
  gens = DEFAULT_PATERNAL_GENS,
): boolean {
  if (a === b) return true;
  const ancA = ancestors(a, edges, gens);
  const ancB = ancestors(b, edges, gens);
  if (ancA.has(b) || ancB.has(a)) return true;
  for (const id of ancA.keys()) {
    if (ancB.has(id)) return true;
  }
  return false;
}