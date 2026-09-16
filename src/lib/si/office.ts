import { DEFAULT_PATERNAL_GENS, generationOf, isKinWithin, type KinEdge, type Person } from "./silsila";

export type SeatKind = "self" | "kin" | "guest";

export interface Seat {
  id: string;
  name: string;
  kind: SeatKind;
  gen: number | null;
}

export function seatsOf(
  people: Person[],
  edges: KinEdge[],
  circle: { id: string; name: string }[],
): Seat[] {
  const self = people.find((p) => p.isSelf);
  const out: Seat[] = [];
  if (self) {
    out.push({ id: `p:${self.id}`, name: self.name, kind: "self", gen: 0 });
  }
  const used = new Set(out.map((s) => s.name.toLowerCase()));
  for (const p of people) {
    if (p.isSelf || !p.living) continue;
    if (!self || !isKinWithin(p.id, self.id, edges, DEFAULT_PATERNAL_GENS)) continue;
    out.push({
      id: `p:${p.id}`,
      name: p.name,
      kind: "kin",
      gen: generationOf(p.id, self.id, edges),
    });
    used.add(p.name.toLowerCase());
  }
  for (const m of circle) {
    if (used.has(m.name.toLowerCase())) continue;
    out.push({ id: `c:${m.id}`, name: m.name, kind: "guest", gen: null });
  }
  return out;
}

export function accountNo(address: string): string {
  const body = address.replace(/^si1/i, "").toUpperCase();
  const a = body.slice(0, 4).padEnd(4, "X");
  const b = body.slice(4, 8).padEnd(4, "X");
  const c = body.slice(-4).padEnd(4, "X");
  return `SI00 ${a} ${b} ${c}`;
}
