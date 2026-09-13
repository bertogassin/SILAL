import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Copy, GitFork, Calendar, Users } from "lucide-react";
import { FAMILY_AIRDROP_TOKENS, formatUnits } from "@/lib/si/tokenomics";
import { useSi, getBalance, type JournalItem } from "@/lib/si/store";
import { useT } from "@/lib/si/use-t";
import { localeTag, type MessageKey } from "@/lib/si/i18n";
import { copyText } from "@/lib/si/copy";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TreeView } from "./tree-view";
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

export function HomeScreen() {
  const t = useT();
  const locale = useSi((s) => s.locale);
  const profile = useSi((s) => s.profile);
  const address = useSi((s) => s.address);
  const referral = useSi((s) => s.referral);
  const people = useSi((s) => s.people);
  const edges = useSi((s) => s.edges);
  const rsvps = useSi((s) => s.rsvps);
  const circle = useSi((s) => s.circle);
  const ledger = useSi((s) => s.ledger);
  const events = useSi((s) => s.events);
  const cases = useSi((s) => s.cases);
  const familyDocs = useSi((s) => s.familyDocs);
  const journal = useSi((s) => s.journal);
  const familyAirdropPaid = useSi((s) => s.familyAirdropPaid);
  const lastBackupAt = useSi((s) => s.lastBackupAt);
  const balance = address ? getBalance(ledger, address) : 0n;

  const nextEvent = events
    .filter((e) => new Date(e.at).getTime() >= Date.now() - 86400000)
    .sort((a, b) => +new Date(a.at) - +new Date(b.at))[0];
  const soon = events.find((e) => {
    const d = new Date(e.at).getTime() - Date.now();
    return d > 0 && d < 36 * 3600 * 1000 && rsvps.includes(e.id);
  });
  const openCases = cases.filter((c) => c.status === "open").length;
  const unsigned = familyDocs.filter((d) => !d.hash).length;
  const pendingRef = referral && referral.referredBy && !referral.qualified;
  const parents = edges.filter((e) => (e.type === "parent" || e.type === "adoptive") && e.to === "self").length;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHead kicker={t("home.greeting")} title={profile?.name ?? t("app.name")}>
        {profile?.taip}
      </PageHead>

      <Card>
        <CardContent className="p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-wool">{t("home.balance")}</p>
          <p className="mt-2 font-display text-4xl tabular tracking-tight">
            {formatUnits(balance)}
            <span className="si-brand ml-2 align-middle text-sm text-muted-foreground">SILAL</span>
          </p>
          <div className="mt-4 flex items-center gap-2">
            <code className="truncate text-xs text-muted-foreground">{address}</code>
            <button
              type="button"
              className="size-11 shrink-0 rounded-lg text-gold"
              aria-label={t("common.copy")}
              onClick={() => {
                if (address) void copyText(address);
              }}
            >
              <Copy className="mx-auto size-4" />
            </button>
          </div>
          <div className="mt-3 flex gap-2">
            <Button asChild size="sm" variant="outline">
              <Link to="/wallet">{t("wallet.send")}</Link>
            </Button>
            <Button asChild size="sm" variant="secondary">
              <Link to="/wallet">{t("wallet.receive")}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {!familyAirdropPaid && (
        <Link to="/silsila" className="si-door p-4">
          <div className="font-display">{FAMILY_AIRDROP_TOKENS.toString()} SILAL</div>
          <p className="mt-1 text-sm text-muted-foreground">{t("home.airdrop")}</p>
          <p className="mt-1 text-xs text-wool">{parents}/2</p>
        </Link>
      )}

      {soon && (
        <Link to="/events" className="block rounded-2xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-wool">{t("home.soon")}</p>
          <div className="mt-1 font-display text-lg">{soon.title}</div>
          <div className="text-sm text-muted-foreground">
            {soon.place} · {new Date(soon.at).toLocaleString(localeTag(locale))}
          </div>
        </Link>
      )}

      {!lastBackupAt && (
        <Link to="/settings" className="block rounded-2xl border border-dashed border-border px-4 py-4 text-sm">
          {t("home.backup")}
        </Link>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm uppercase tracking-[0.16em] text-wool">
            <GitFork className="size-4" /> {t("nav.tree")}
          </h2>
          <Link to="/silsila" className="text-sm text-gold">
            {t("common.more")}
          </Link>
        </div>
        {people.length <= 1 ? (
          <Link
            to="/silsila"
            className="flex items-center justify-between rounded-2xl border border-dashed border-border px-4 py-5"
          >
            <span>{t("home.emptyTree")}</span>
            <ArrowUpRight className="size-4 text-gold" />
          </Link>
        ) : (
          <TreeView />
        )}
      </section>

      {nextEvent && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm uppercase tracking-[0.16em] text-wool">
            <Calendar className="size-4" /> {t("home.next")}
          </h2>
          <Link to="/events" className="block rounded-2xl border border-border bg-card p-4">
            <div className="font-display text-lg">{nextEvent.title}</div>
            <div className="mt-1 text-sm text-muted-foreground">
              {nextEvent.place} · {new Date(nextEvent.at).toLocaleString(localeTag(locale))}
            </div>
            {rsvps.includes(nextEvent.id) && (
              <div className="mt-2 text-xs text-gold">{t("events.rsvped")}</div>
            )}
          </Link>
        </section>
      )}

      {(openCases > 0 || unsigned > 0 || pendingRef) && (
        <section>
          <h2 className="mb-3 text-sm uppercase tracking-[0.16em] text-wool">{t("home.notices")}</h2>
          <div className="grid gap-2">
            {openCases > 0 && (
              <Link to="/mekhk" className="rounded-2xl border border-border bg-card p-4">
                {t("nav.mekhk")} · {openCases}
              </Link>
            )}
            {unsigned > 0 && (
              <Link to="/archive" className="rounded-2xl border border-border bg-card p-4">
                {t("family.title")} · {unsigned}
              </Link>
            )}
            {pendingRef && (
              <Link to="/referrals" className="rounded-2xl border border-border bg-card p-4">
                {t("ref.pending")}
              </Link>
            )}
          </div>
        </section>
      )}

      <section className="grid grid-cols-2 gap-3">
        <Link to="/circle" className="si-door p-4">
          <Users className="mb-2 size-4 text-wool" />
          <div className="font-display">{t("home.circle")}</div>
          <div className="text-sm text-muted-foreground">{circle.length}</div>
        </Link>
        <Link to="/referrals" className="si-door p-4">
          <div className="text-xs uppercase tracking-[0.16em] text-wool">{t("home.ref")}</div>
          <div className="mt-2 font-mono text-sm">{referral?.code}</div>
        </Link>
      </section>
      <div className="grid grid-cols-2 gap-3">
        <Link to="/house" className="si-door p-4">
          <div className="font-display">{t("nav.house")}</div>
          <p className="mt-1 text-sm text-muted-foreground">{t("house.lifeHint")}</p>
        </Link>
        <Link to="/wallet" className="si-door p-4">
          <div className="font-display">{t("house.bank")}</div>
          <p className="mt-1 text-sm text-muted-foreground">{t("house.bankBlurb")}</p>
        </Link>
      </div>

      {journal.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm uppercase tracking-[0.16em] text-wool">{t("journal.title")}</h2>
          <p className="mb-3 text-xs text-muted-foreground">{t("journal.hint")}</p>
          <ul className="si-cv divide-y divide-border rounded-2xl border border-border">
            {journal.slice(0, 5).map((j) => (
              <li key={j.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <span>
                  {t(JOURNAL_KEY[j.kind])}
                  {j.label ? ` · ${j.label}` : ""}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(j.at).toLocaleDateString(localeTag(locale))}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
