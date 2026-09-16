import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useSi, type JournalItem } from "@/lib/si/store";
import { useT } from "@/lib/si/use-t";
import { localeTag, type MessageKey } from "@/lib/si/i18n";
import { playSound } from "@/lib/si/sounds";
import { sayingOfDay } from "@/lib/si/today";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Empty } from "./empty";
import { PageHead } from "./page-head";

const JOURNAL_KEY: Record<JournalItem["kind"], MessageKey> = {
  tx: "journal.tx",
  rsvp: "journal.rsvp",
  cred: "journal.cred",
  mekhk: "journal.mekhk",
  tree: "journal.tree",
  ref: "journal.ref",
  airdrop: "journal.airdrop",
  invite: "journal.invite",
};

interface Row {
  id: string;
  at: number;
  title: string;
  href: "/silsila" | "/house" | "/events" | "/archive" | "/mekhk" | "/wallet" | "/cred";
  kicker: string;
}

export function ChronicleScreen() {
  const t = useT();
  const locale = useSi((s) => s.locale);
  const journal = useSi((s) => s.journal);
  const familyDocs = useSi((s) => s.familyDocs);
  const studyNotes = useSi((s) => s.studyNotes);
  const documents = useSi((s) => s.documents);
  const events = useSi((s) => s.events);
  const pots = useSi((s) => s.pots);
  const qards = useSi((s) => s.qards);
  const claims = useSi((s) => s.claims);
  const addStudy = useSi((s) => s.addStudy);
  const [note, setNote] = useState("");

  const rows = useMemo(() => {
    const out: Row[] = [];
    for (const j of journal) {
      out.push({
        id: `j-${j.id}`,
        at: j.at,
        title: `${t(JOURNAL_KEY[j.kind])}${j.label ? ` · ${j.label}` : ""}`,
        href: j.kind === "tree" ? "/silsila" : j.kind === "rsvp" ? "/events" : j.kind === "mekhk" ? "/mekhk" : j.kind === "cred" ? "/cred" : "/wallet",
        kicker: t("journal.title"),
      });
    }
    for (const d of familyDocs) {
      out.push({ id: `f-${d.id}`, at: d.createdAt, title: d.title, href: "/house", kicker: t("chr.doc") });
    }
    for (const n of studyNotes) {
      out.push({ id: `n-${n.id}`, at: n.createdAt, title: n.title, href: "/house", kicker: t("chr.memory") });
    }
    for (const d of documents) {
      out.push({ id: `a-${d.id}`, at: d.addedAt, title: d.title, href: "/archive", kicker: t("nav.archive") });
    }
    for (const e of events) {
      out.push({ id: `e-${e.id}`, at: new Date(e.at).getTime(), title: e.title, href: "/events", kicker: t("nav.events") });
    }
    for (const p of pots) {
      out.push({ id: `p-${p.id}`, at: p.createdAt, title: p.title, href: "/house", kicker: t("chr.kazna") });
    }
    for (const q of qards) {
      out.push({ id: `q-${q.id}`, at: q.createdAt, title: q.to, href: "/house", kicker: t("bank.qard") });
    }
    for (const c of claims) {
      out.push({ id: `c-${c.id}`, at: c.createdAt, title: c.title, href: "/house", kicker: t("house.insure") });
    }
    out.sort((a, b) => b.at - a.at);
    return out.slice(0, 40);
  }, [journal, familyDocs, studyNotes, documents, events, pots, qards, claims, t]);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHead kicker={t("chr.kicker")} title={t("chr.title")}>
        {t("chr.hint")}
      </PageHead>
      <p className="font-serif text-sm italic text-pretty text-muted-foreground">{t(sayingOfDay())}</p>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!note.trim()) return;
          addStudy(note.trim(), "");
          setNote("");
          void playSound("ui_success");
        }}
      >
        <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("chr.memory")} />
        <Button type="submit">{t("craft.add")}</Button>
      </form>
      {rows.length === 0 ? (
        <Empty>{t("chr.empty")}</Empty>
      ) : (
        <ul className="si-cv divide-y divide-border rounded-2xl border border-border">
          {rows.map((r) => (
            <li key={r.id}>
              <Link to={r.href} className="flex min-h-12 items-center justify-between gap-3 px-4 py-3">
                <span className="min-w-0">
                  <span className="si-kicker block">{r.kicker}</span>
                  <span className="block truncate text-sm">{r.title}</span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {new Date(r.at).toLocaleDateString(localeTag(locale))}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
