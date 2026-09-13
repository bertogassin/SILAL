import { useMemo, useState } from "react";
import { useSi } from "@/lib/si/store";
import { useT } from "@/lib/si/use-t";
import {
  childrenOf,
  parentsOf,
  spousesOf,
  isKinWithin,
  DEFAULT_PATERNAL_GENS,
  type EdgeType,
  type Gender,
  type KinshipKind,
  type KinshipResult,
  type Person,
} from "@/lib/si/silsila";
import { t as tr, type MessageKey, type Locale } from "@/lib/si/i18n";
import { playSound } from "@/lib/si/sounds";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { TreeView } from "./tree-view";
import { PageHead } from "./page-head";
import { cn } from "@/lib/utils";

type Tab = "tree" | "people" | "calc";

export function SilsilaScreen() {
  const t = useT();
  const locale = useSi((s) => s.locale);
  const people = useSi((s) => s.people);
  const edges = useSi((s) => s.edges);
  const addPerson = useSi((s) => s.addPerson);
  const link = useSi((s) => s.link);
  const exportGedcom = useSi((s) => s.exportGedcom);
  const kinship = useSi((s) => s.kinship);
  const updatePerson = useSi((s) => s.updatePerson);
  const removePerson = useSi((s) => s.removePerson);
  const importGedcom = useSi((s) => s.importGedcom);

  const [tab, setTab] = useState<Tab>("tree");
  const [open, setOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [name, setName] = useState("");
  const [gender, setGender] = useState<Gender>("unknown");
  const [living, setLiving] = useState(true);
  const [consent, setConsent] = useState(false);
  const [rel, setRel] = useState<EdgeType>("parent");
  const [relTo, setRelTo] = useState("self");
  const [year, setYear] = useState("");
  const [notes, setNotes] = useState("");
  const [a, setA] = useState("self");
  const [b, setB] = useState("");
  const result = a && b ? kinship(a, b) : null;
  const detail = people.find((p) => p.id === detailId) ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return people;
    return people.filter((p) => p.name.toLowerCase().includes(q) || (p.taip ?? "").toLowerCase().includes(q));
  }, [people, query]);

  function add() {
    if (!name.trim()) return;
    const id = addPerson({
      name: name.trim(),
      gender,
      living,
      consentToPublish: !living || consent,
      birthYear: year ? Number(year) || undefined : undefined,
      notes: notes.trim() || undefined,
    });
    if (relTo) {
      if (rel === "parent" || rel === "adoptive") link(rel, id, relTo);
      else if (rel === "child") link("parent", relTo, id);
      else link(rel, relTo, id);
    }
    setName("");
    setYear("");
    setNotes("");
    setOpen(false);
    setDetailId(id);
  }

  function downloadGedcom() {
    const text = exportGedcom();
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const ael = document.createElement("a");
    ael.href = url;
    ael.download = "silsila.ged";
    ael.click();
    URL.revokeObjectURL(url);
    void playSound("ui_success");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-end justify-between gap-3">
        <PageHead kicker={t("silsila.title")} title={t("silsila.tree")} />
        <Button size="sm" className="mb-1 shrink-0" onClick={() => setOpen(true)}>
          {t("silsila.addPerson")}
        </Button>
      </div>

      <div className="grid grid-cols-3 rounded-xl border border-border bg-card p-1">
        {(["tree", "people", "calc"] as Tab[]).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "h-10 rounded-lg text-sm",
              tab === id ? "bg-background text-foreground" : "text-muted-foreground",
            )}
          >
            {id === "tree" ? t("silsila.tree") : id === "people" ? t("silsila.people") : t("silsila.calc")}
          </button>
        ))}
      </div>

      {tab === "tree" && (
        <div className="space-y-4">
          <TreeView onSelect={setDetailId} />
          <label className="block w-full cursor-pointer rounded-2xl border border-dashed border-border px-4 py-4 text-left">
            <div className="font-display">{t("silsila.import")}</div>
            <div className="text-sm text-muted-foreground">{t("silsila.importHint")}</div>
            <input
              type="file"
              accept=".ged,.gedcom,text/plain"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                void f.text().then((text) => {
                  importGedcom(text);
                  e.target.value = "";
                });
              }}
            />
          </label>
          <p className="text-xs text-muted-foreground">{t("silsila.noConsent")}</p>
        </div>
      )}

      {tab === "people" && (
        <div className="space-y-3">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("silsila.search")}
          />
          <ul className="divide-y divide-border rounded-2xl border border-border">
            {filtered.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-4 py-3 text-left"
                  onClick={() => setDetailId(p.id)}
                >
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.isSelf
                        ? t("silsila.self")
                        : p.living
                          ? t("silsila.living")
                          : t("silsila.ancestor")}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!p.isSelf && isKinWithin(p.id, "self", edges, DEFAULT_PATERNAL_GENS) && (
                      <Badge tone="gold">{t("co.kin")}</Badge>
                    )}
                    {p.living && !p.consentToPublish && !p.isSelf && (
                      <Badge tone="wool">{t("silsila.consent")}</Badge>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === "calc" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{t("silsila.ruleHint")}</p>
          <Label>{t("silsila.personA")}</Label>
          <select
            className="h-11 w-full rounded-lg border border-border bg-background px-3"
            value={a}
            onChange={(e) => setA(e.target.value)}
          >
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <Label>{t("silsila.personB")}</Label>
          <select
            className="h-11 w-full rounded-lg border border-border bg-background px-3"
            value={b}
            onChange={(e) => setB(e.target.value)}
          >
            <option value="">{t("silsila.personB")}</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {result && (
            <>
              {(() => {
                const pa = people.find((p) => p.id === a);
                const pb = people.find((p) => p.id === b);
                const need =
                  (pa?.living && !pa.consentToPublish && !pa.isSelf) ||
                  (pb?.living && !pb.consentToPublish && !pb.isSelf);
                return need ? <p className="text-sm text-wool">{t("silsila.needBoth")}</p> : null;
              })()}
              <Verdict
                kind={result.kind}
                reasonKey={result.reasonKey}
                locale={locale}
                paternal={result.paternalCommon}
                maternal={result.maternalCommon}
              />
              <p className="text-sm text-wool">
                {isKinWithin(a, b, edges, DEFAULT_PATERNAL_GENS) ? t("co.kinBody") : t("co.guestBody")}
              </p>
            </>
          )}
        </div>
      )}

      <Button variant="secondary" className="w-full" onClick={downloadGedcom}>
        {t("silsila.export")}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("silsila.addPerson")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label>{t("on.name")}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
            <Label>{t("silsila.year")}</Label>
            <Input value={year} onChange={(e) => setYear(e.target.value)} inputMode="numeric" />
            <Label>{t("silsila.notes")}</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
            <Label>{t("silsila.gender")}</Label>
            <div className="grid grid-cols-3 gap-2">
              {(["m", "f", "unknown"] as Gender[]).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGender(g)}
                  className={cn(
                    "h-10 rounded-lg border text-sm",
                    gender === g ? "border-gold" : "border-border",
                  )}
                >
                  {g === "m" ? t("silsila.g.m") : g === "f" ? t("silsila.g.f") : t("silsila.g.x")}
                </button>
              ))}
            </div>
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input type="checkbox" checked={living} onChange={(e) => setLiving(e.target.checked)} />
              {t("silsila.living")}
            </label>
            {living && (
              <label className="flex min-h-11 items-center gap-2 text-sm">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                {t("silsila.markConsent")}
              </label>
            )}
            <Label>{t("silsila.relation")}</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(["parent", "child", "spouse", "adoptive"] as EdgeType[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRel(r)}
                  className={cn(
                    "h-10 rounded-lg border text-sm",
                    rel === r ? "border-gold" : "border-border",
                  )}
                >
                  {r === "parent"
                    ? t("silsila.addParent")
                    : r === "child"
                      ? t("silsila.addChild")
                      : r === "spouse"
                        ? t("silsila.addSpouse")
                        : t("silsila.adoptive")}
                </button>
              ))}
            </div>
            <select
              className="h-11 w-full rounded-lg border border-border bg-background px-3"
              value={relTo}
              onChange={(e) => setRelTo(e.target.value)}
            >
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <Button className="w-full" onClick={add}>
              {t("common.add")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detail} onOpenChange={(v) => !v && setDetailId(null)}>
        <DialogContent>
          {detail && (
            <PersonCard
              key={detail.id}
              person={detail}
              people={people}
              parentIds={parentsOf(detail.id, edges).map((e) => e.from)}
              childIds={childrenOf(detail.id, edges).map((e) => e.to)}
              spouseIds={spousesOf(detail.id, edges)}
              kin={detail.isSelf ? null : kinship("self", detail.id)}
              locale={locale}
              onConsent={() => updatePerson(detail.id, { consentToPublish: true })}
              onRemove={() => {
                removePerson(detail.id);
                setDetailId(null);
              }}
              onOpen={(id) => setDetailId(id)}
              onWallet={(walletAddress) => updatePerson(detail.id, { walletAddress: walletAddress || undefined })}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PersonCard({
  person,
  people,
  parentIds,
  childIds,
  spouseIds,
  kin,
  locale,
  onConsent,
  onRemove,
  onOpen,
  onWallet,
}: {
  person: Person;
  people: Person[];
  parentIds: string[];
  childIds: string[];
  spouseIds: string[];
  kin: KinshipResult | null;
  locale: Locale;
  onConsent: () => void;
  onRemove: () => void;
  onOpen: (id: string) => void;
  onWallet: (address: string) => void;
}) {
  const t = useT();
  const nameOf = (id: string) => people.find((p) => p.id === id)?.name ?? id;
  const [addr, setAddr] = useState(person.walletAddress ?? "");
  return (
    <div className="space-y-4">
      <DialogHeader>
        <DialogTitle>{person.name}</DialogTitle>
      </DialogHeader>
      <div className="flex flex-wrap gap-2">
        <Badge>{person.isSelf ? t("silsila.self") : person.living ? t("silsila.living") : t("silsila.ancestor")}</Badge>
        {person.isMinor && <Badge tone="gold">{t("silsila.minor")}</Badge>}
        {person.birthYear ? <Badge>{String(person.birthYear)}</Badge> : null}
        {person.living && !person.consentToPublish && !person.isSelf && (
          <Badge tone="wool">{t("silsila.consent")}</Badge>
        )}
      </div>
      {person.notes && <p className="text-sm text-pretty">{person.notes}</p>}
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.16em] text-wool">{t("silsila.walletField")}</p>
        <Input value={addr} onChange={(e) => setAddr(e.target.value)} />
        <Button
          size="sm"
          variant="secondary"
          onClick={() => onWallet(addr.trim())}
        >
          {t("common.save")}
        </Button>
      </div>
      <RelList label={t("silsila.parents")} ids={parentIds} nameOf={nameOf} onOpen={onOpen} empty={t("silsila.noneFound")} />
      <RelList label={t("silsila.children")} ids={childIds} nameOf={nameOf} onOpen={onOpen} empty={t("silsila.noneFound")} />
      <RelList label={t("silsila.spouses")} ids={spouseIds} nameOf={nameOf} onOpen={onOpen} empty={t("silsila.noneFound")} />
      {kin && (
        <div>
          <p className="mb-2 text-xs uppercase tracking-[0.16em] text-wool">{t("silsila.withYou")}</p>
          <Verdict
            kind={kin.kind}
            reasonKey={kin.reasonKey}
            locale={locale}
            paternal={kin.paternalCommon}
            maternal={kin.maternalCommon}
          />
        </div>
      )}
      {person.living && !person.consentToPublish && !person.isSelf && (
        <Button variant="secondary" className="w-full" onClick={onConsent}>
          {t("silsila.markConsent")}
        </Button>
      )}
      {!person.isSelf && (
        <Button variant="ghost" className="w-full text-garnet" onClick={onRemove}>
          {t("silsila.removePerson")}
        </Button>
      )}
    </div>
  );
}

function RelList({
  label,
  ids,
  nameOf,
  onOpen,
  empty,
}: {
  label: string;
  ids: string[];
  nameOf: (id: string) => string;
  onOpen: (id: string) => void;
  empty: string;
}) {
  return (
    <div>
      <p className="mb-1 text-xs uppercase tracking-[0.16em] text-wool">{label}</p>
      {ids.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {ids.map((id) => (
            <button
              key={id}
              type="button"
              className="rounded-xl border border-border px-3 py-2 text-sm"
              onClick={() => onOpen(id)}
            >
              {nameOf(id)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Verdict({
  kind,
  reasonKey,
  locale,
  paternal,
  maternal,
}: {
  kind: KinshipKind;
  reasonKey: string;
  locale: Locale;
  paternal?: { id: string; genA: number; genB: number };
  maternal?: { id: string; genA: number; genB: number };
}) {
  const t = useT();
  const tone = kind === "Allowed" ? "wool" : kind === "Warning" ? "gold" : "garnet";
  const label =
    kind === "Allowed" ? t("silsila.allowed") : kind === "Warning" ? t("silsila.warning") : t("silsila.blocked");
  const reason = tr(locale, reasonKey as MessageKey);
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <Badge tone={tone}>{label}</Badge>
      <p className="mt-3 font-display text-xl">{reason}</p>
      {(paternal || maternal) && (
        <p className="mt-2 text-sm text-muted-foreground">
          {t("silsila.generations")}
          {paternal ? ` · ${t("silsila.father")} ${paternal.genA}/${paternal.genB}` : ""}
          {maternal ? ` · ${t("silsila.mother")} ${maternal.genA}/${maternal.genB}` : ""}
        </p>
      )}
      {kind === "BlockedByPolicy" && (
        <p className="mt-2 text-sm text-muted-foreground">{t("silsila.blockedNote")}</p>
      )}
    </div>
  );
}
