import type { MessageKey } from "./i18n";
import { LIVE_ROOMS } from "./blueprint";

export interface FindHit {
  id: string;
  href: string;
  label: string;
  kicker: MessageKey;
}

export const FIND_ROOMS: { href: string; key: MessageKey }[] = LIVE_ROOMS.map((r) => ({
  href: r.href,
  key: r.key,
}));

export function findHits(
  q: string,
  bag: {
    rooms: { href: string; label: string }[];
    people: { id: string; name: string }[];
    events: { id: string; title: string }[];
    circle: { id: string; name: string }[];
  },
): FindHit[] {
  const n = q.trim().toLowerCase();
  if (n.length < 1) return [];
  const out: FindHit[] = [];
  for (const r of bag.rooms) {
    if (r.label.toLowerCase().includes(n) || r.href.includes(n)) {
      out.push({ id: r.href, href: r.href, label: r.label, kicker: "find.room" });
    }
  }
  for (const p of bag.people) {
    if (p.name.toLowerCase().includes(n)) {
      out.push({ id: `p:${p.id}`, href: "/silsila", label: p.name, kicker: "nav.tree" });
    }
  }
  for (const e of bag.events) {
    if (e.title.toLowerCase().includes(n)) {
      out.push({ id: `e:${e.id}`, href: "/events", label: e.title, kicker: "nav.events" });
    }
  }
  for (const c of bag.circle) {
    if (c.name.toLowerCase().includes(n)) {
      out.push({ id: `c:${c.id}`, href: "/circle", label: c.name, kicker: "nav.circle" });
    }
  }
  return out.slice(0, 8);
}
