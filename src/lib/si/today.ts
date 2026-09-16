import type { MessageKey } from "./i18n";
import type { AppPath } from "./blueprint";
import type { Person, KinEdge } from "./silsila";
import type { UserEvent } from "./events-data";
import type { FamilyPot, Household, StudyNote } from "./house";

export interface Deed {
  id: string;
  href: AppPath;
  key: MessageKey;
}

export function todayDeeds(s: {
  people: Person[];
  edges: KinEdge[];
  familyAirdropPaid: boolean;
  lastBackupAt: number | null;
  events: UserEvent[];
  rsvps: string[];
  familyDocs: { signatures: unknown[]; required: number }[];
  cases: { status: string }[];
  studyNotes: StudyNote[];
  pots: FamilyPot[];
  circle: { id: string }[];
  household: Household;
}): Deed[] {
  const out: Deed[] = [];
  const parents = s.edges.filter((e) => (e.type === "parent" || e.type === "adoptive") && e.to === "self").length;
  if (!s.familyAirdropPaid && parents < 2) out.push({ id: "parents", href: "/silsila", key: "today.parents" });
  if (s.people.length < 3) out.push({ id: "tree", href: "/silsila", key: "today.tree" });
  if (!s.lastBackupAt) out.push({ id: "backup", href: "/settings", key: "today.backup" });
  if (s.familyDocs.some((d) => d.signatures.length < d.required)) out.push({ id: "sign", href: "/house", key: "today.sign" });
  if (s.cases.some((c) => c.status === "open")) out.push({ id: "mekhk", href: "/mekhk", key: "today.mekhk" });
  const next = s.events
    .filter((e) => new Date(e.at).getTime() > Date.now() - 3600_000)
    .sort((a, b) => +new Date(a.at) - +new Date(b.at))[0];
  if (next && !s.rsvps.includes(next.id)) out.push({ id: "event", href: "/events", key: "today.event" });
  if (s.studyNotes.length === 0) out.push({ id: "note", href: "/house", key: "today.note" });
  if (s.pots.length === 0) out.push({ id: "pot", href: "/house", key: "today.pot" });
  if (s.circle.length === 0) out.push({ id: "circle", href: "/circle", key: "today.circle" });
  if (!s.household.work && !s.household.housing) out.push({ id: "live", href: "/house", key: "today.live" });
  return out.slice(0, 5);
}

const SAYINGS: MessageKey[] = [
  "custom.adat",
  "custom.nine",
  "custom.guest",
  "custom.qard",
  "ethics.p1",
  "token.notShare",
  "app.tagline",
];

export function sayingOfDay(now = Date.now()): MessageKey {
  const day = Math.floor(now / 86_400_000);
  return SAYINGS[Math.abs(day) % SAYINGS.length];
}
