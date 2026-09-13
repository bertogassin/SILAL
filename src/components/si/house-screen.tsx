import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useSi, getBalance, fundAddress } from "@/lib/si/store";
import { FOUNDATION, potAddress } from "@/lib/si/foundation";
import { useT } from "@/lib/si/use-t";
import type { MessageKey } from "@/lib/si/i18n";
import { FUND_ORDER, FUNDS, FAMILY_AIRDROP_TOKENS, REFERRAL, formatUnits, fundUnits, parseAmountToUnits, tokensToUnits } from "@/lib/si/tokenomics";
import { FUND_VESTING, vestedRatio } from "@/lib/si/house";
import { referrerEarnedInWindow } from "@/lib/si/referral";
import { isSiAddress, protocolAddress } from "@/lib/si/crypto";
import { playSound } from "@/lib/si/sounds";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { accountNo, seatsOf, type Seat } from "@/lib/si/office";
import { cn } from "@/lib/utils";
import { Empty } from "./empty";
import { PageHead } from "./page-head";

type Room = "funds" | "earn" | "work" | "care" | "aid" | "learn" | "live" | "bank" | "insure";

const ROOMS: { id: Room; key: MessageKey; blurb: MessageKey }[] = [
  { id: "earn", key: "house.earn", blurb: "house.earnBlurb" },
  { id: "live", key: "house.live", blurb: "house.liveBlurb" },
  { id: "learn", key: "house.learn", blurb: "house.learnBlurb" },
  { id: "work", key: "house.work", blurb: "house.workHint" },
  { id: "care", key: "house.care", blurb: "house.careHint" },
  { id: "aid", key: "house.aid", blurb: "house.aidHint" },
  { id: "bank", key: "house.bank", blurb: "house.bankBlurb" },
  { id: "insure", key: "house.insure", blurb: "house.insureBlurb" },
  { id: "funds", key: "house.funds", blurb: "house.notInvest" },
];

export function HouseScreen() {
  const t = useT();
  const [room, setRoom] = useState<Room | null>(null);
  const [deskId, setDeskId] = useState<string | null>(null);
  const current = ROOMS.find((r) => r.id === room);
  const people = useSi((s) => s.people);
  const edges = useSi((s) => s.edges);
  const circle = useSi((s) => s.circle);
  const seats = seatsOf(people, edges, circle);
  const desk = seats.find((s) => s.id === deskId) ?? null;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHead
        kicker={t("co.kicker")}
        title={desk ? desk.name : current ? t(current.key) : t("co.title")}
      >
        {desk
          ? t(desk.kind === "kin" ? "co.kinHint" : desk.kind === "self" ? "co.selfHint" : "co.guestHint")
          : t(current ? current.blurb : "co.charter")}
      </PageHead>
      {room || desk ? (
        <button
          type="button"
          className="text-sm text-gold"
          onClick={() => {
            setRoom(null);
            setDeskId(null);
          }}
        >
          {t("on.back")}
        </button>
      ) : (
        <HomeFloor
          seats={seats}
          onRoom={setRoom}
          onDesk={(id) => {
            setDeskId(id);
            setRoom(null);
          }}
        />
      )}
      {desk && <DeskRoom key={desk.id} seat={desk} />}
      {room === "funds" && <FundsRoom />}
      {room === "earn" && <EarnRoom />}
      {room === "work" && <WorkRoom />}
      {room === "care" && <CareRoom />}
      {room === "aid" && <AidRoom />}
      {room === "learn" && <LearnRoom />}
      {room === "live" && <LiveRoom />}
      {room === "bank" && <BankRoom />}
      {room === "insure" && <InsureRoom />}
    </div>
  );
}

function HomeFloor({
  seats,
  onRoom,
  onDesk,
}: {
  seats: Seat[];
  onRoom: (r: Room) => void;
  onDesk: (id: string) => void;
}) {
  const t = useT();
  const add = useSi((s) => s.addCircleMember);
  const [name, setName] = useState("");
  return (
    <div className="space-y-6">
      <section className="si-charter rounded-2xl border border-gold/40 bg-card p-5">
        <p className="font-serif text-sm italic text-wool">{t("co.seal")}</p>
        <p className="mt-3 text-sm text-pretty">{t("co.charterBody")}</p>
      </section>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button type="button" onClick={() => onRoom("bank")} className="si-door min-h-24 p-3 text-left">
          <div className="font-display text-xl">{t("house.bank")}</div>
          <p className="mt-1 text-sm text-muted-foreground">{t("house.bankBlurb")}</p>
        </button>
        <button type="button" onClick={() => onRoom("insure")} className="si-door min-h-24 p-3 text-left">
          <div className="font-display text-xl">{t("house.insure")}</div>
          <p className="mt-1 text-sm text-muted-foreground">{t("house.insureBlurb")}</p>
        </button>
      </div>
      <section>
        <h2 className="font-display text-lg">{t("co.offices")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("co.officesHint")}</p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {seats.map((s) => (
            <button key={s.id} type="button" onClick={() => onDesk(s.id)} className="si-door min-h-24 p-3 text-left">
              <p className="text-[11px] uppercase tracking-[0.18em] text-gold">
                {s.kind === "self" ? t("co.self") : s.kind === "kin" ? t("co.kin") : t("co.guest")}
              </p>
              <div className="mt-2 font-display text-lg">{s.name}</div>
              {s.kind === "kin" && s.gen !== null && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("co.gen")} {Math.abs(s.gen)}/9
                </p>
              )}
            </button>
          ))}
        </div>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            add(name.trim(), "member");
            setName("");
            void playSound("invite_accepted");
          }}
        >
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("co.inviteAny")} />
          <Button type="submit">{t("circle.add")}</Button>
        </form>
      </section>
      <section>
        <h2 className="font-display text-lg">{t("co.services")}</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {ROOMS.filter((r) => r.id !== "bank" && r.id !== "insure").map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => onRoom(r.id)}
              className="si-door min-h-24 p-3 text-left"
            >
              <div className="font-display">{t(r.key)}</div>
              <p className="mt-1 text-xs text-muted-foreground">{t(r.blurb)}</p>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function DeskRoom({ seat }: { seat: Seat }) {
  const t = useT();
  const address = useSi((s) => s.address);
  const ledger = useSi((s) => s.ledger);
  const note = useSi((s) => s.deskNotes[seat.id] ?? "");
  const setNote = useSi((s) => s.setDeskNote);
  const [draft, setDraft] = useState(note);
  const bal = address ? getBalance(ledger, address) : 0n;
  return (
    <div className="si-desk space-y-5 rounded-2xl border border-gold/30 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-gold">{t("co.plate")}</p>
          <h2 className="font-display text-2xl">{seat.name}</h2>
        </div>
        <Badge tone={seat.kind === "kin" ? "gold" : "wool"}>
          {seat.kind === "self" ? t("co.self") : seat.kind === "kin" ? t("co.kin") : t("co.guest")}
        </Badge>
      </div>
      {seat.kind === "self" && address && (
        <div className="rounded-xl border border-border bg-background/40 p-4">
          <p className="font-mono text-sm">{accountNo(address)}</p>
          <p className="mt-1 font-display text-2xl tabular">
            {formatUnits(bal)} <span className="si-brand text-xs text-muted-foreground">SILAL</span>
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button asChild size="sm" variant="secondary">
              <Link to="/wallet">{t("nav.wallet")}</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/silsila">{t("nav.tree")}</Link>
            </Button>
          </div>
        </div>
      )}
      {seat.kind === "kin" && (
        <p className="text-sm text-pretty">{t("co.kinBody")}</p>
      )}
      {seat.kind === "guest" && (
        <p className="text-sm text-pretty">{t("co.guestBody")}</p>
      )}
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          setNote(seat.id, draft);
          void playSound("ui_success");
        }}
      >
        <Label>{t("co.blotter")}</Label>
        <textarea
          className="min-h-28 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <Button type="submit">{t("common.save")}</Button>
      </form>
    </div>
  );
}

function FundsRoom() {
  const t = useT();
  const ledger = useSi((s) => s.ledger);
  const grants = useSi((s) => s.grants);
  const addGrant = useSi((s) => s.addGrant);
  const incidents = useSi((s) => s.incidents);
  const addIncident = useSi((s) => s.addIncident);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [ask, setAsk] = useState("");
  const [incTitle, setIncTitle] = useState("");
  const [incBody, setIncBody] = useState("");

  return (
    <div className="space-y-5">
      <p className="text-sm text-pretty">{t("house.notInvest")}</p>
      <ul className="overflow-hidden rounded-2xl border border-border">
        {FUND_ORDER.map((id) => {
          const left = getBalance(ledger, fundAddress(id));
          const orig = fundUnits(id);
          const ratio = vestedRatio(id);
          const vest = FUND_VESTING[id];
          return (
            <li key={id} className="border-b border-border px-4 py-3 last:border-0">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium">{t(`fund.${id}` as MessageKey)}</div>
                  <div className="text-xs text-muted-foreground">
                    {vest
                      ? `${vest.cliffMonths} / ${vest.durationMonths} ${t("house.months")}`
                      : t("house.spendable")}
                  </div>
                </div>
                <div className="text-right tabular text-sm">{formatUnits(left, 0)}</div>
              </div>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-stone">
                <div className="h-full bg-gold/80" style={{ width: `${Math.round(ratio * 100)}%` }} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatUnits(orig, 0)} · {FUNDS[id].rule}
              </p>
            </li>
          );
        })}
      </ul>
      <form
        className="space-y-3 rounded-2xl border border-border p-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim() || !body.trim()) return;
          addGrant(title.trim(), body.trim(), ask.trim() || "0");
          setTitle("");
          setBody("");
          setAsk("");
        }}
      >
        <h2 className="font-display text-lg">{t("house.grant")}</h2>
        <p className="text-sm text-muted-foreground">{t("house.grantHint")}</p>
        <Label>{t("archive.titleField")}</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        <Label>{t("house.ask")}</Label>
        <Input value={ask} onChange={(e) => setAsk(e.target.value)} inputMode="decimal" />
        <Label>{t("mekhk.protocol")}</Label>
        <textarea
          className="min-h-24 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <Button type="submit">{t("house.seal")}</Button>
      </form>
      {grants.length > 0 && (
        <ul className="space-y-2">
          {grants.map((g) => (
            <li key={g.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="font-display">{g.title}</span>
                <Badge>{g.ask} SILAL</Badge>
              </div>
              <p className="mt-2 text-sm text-pretty">{g.body}</p>
              {g.hash && <p className="mt-2 break-all font-mono text-xs text-muted-foreground">{g.hash}</p>}
            </li>
          ))}
        </ul>
      )}
      <form
        className="space-y-3 rounded-2xl border border-border p-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!incTitle.trim() || !incBody.trim()) return;
          addIncident(incTitle.trim(), incBody.trim());
          setIncTitle("");
          setIncBody("");
        }}
      >
        <h2 className="font-display text-lg">{t("house.incident")}</h2>
        <p className="text-sm text-muted-foreground">{t("house.incidentHint")}</p>
        <Input value={incTitle} onChange={(e) => setIncTitle(e.target.value)} placeholder={t("archive.titleField")} />
        <textarea
          className="min-h-20 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
          value={incBody}
          onChange={(e) => setIncBody(e.target.value)}
        />
        <Button type="submit" variant="secondary">
          {t("house.seal")}
        </Button>
      </form>
      {incidents.map((i) => (
        <div key={i.id} className="rounded-2xl border border-border p-4">
          <div className="font-display">{i.title}</div>
          <p className="mt-1 text-sm">{i.body}</p>
        </div>
      ))}
    </div>
  );
}

function WorkRoom() {
  const t = useT();
  const workshops = useSi((s) => s.workshops);
  const add = useSi((s) => s.addWorkshop);
  const remove = useSi((s) => s.removeWorkshop);
  const [title, setTitle] = useState("");
  const [place, setPlace] = useState("");
  const [contact, setContact] = useState("");
  return (
    <div className="space-y-5">
      <p className="text-sm text-pretty">{t("house.workHint")}</p>
      <form
        className="space-y-3 rounded-2xl border border-border p-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim()) return;
          add(title.trim(), place.trim(), contact.trim());
          setTitle("");
          setPlace("");
          setContact("");
        }}
      >
        <Label>{t("archive.titleField")}</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        <Label>{t("events.place")}</Label>
        <Input value={place} onChange={(e) => setPlace(e.target.value)} />
        <Label>{t("settings.familyContact")}</Label>
        <Input value={contact} onChange={(e) => setContact(e.target.value)} />
        <Button type="submit">{t("common.add")}</Button>
      </form>
      {workshops.length === 0 ? (
        <Empty>{t("house.workEmpty")}</Empty>
      ) : (
        <ul className="space-y-2">
          {workshops.map((w) => (
            <li key={w.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-display text-lg">{w.title}</div>
                  {w.place && <p className="text-sm text-muted-foreground">{w.place}</p>}
                  {w.contact && <p className="text-sm">{w.contact}</p>}
                </div>
                <button type="button" className="text-xs text-muted-foreground" onClick={() => remove(w.id)}>
                  {t("common.remove")}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CareRoom() {
  const t = useT();
  const documents = useSi((s) => s.documents);
  const docs = documents.filter((d) => d.kind === "medical");
  const familyDocs = useSi((s) => s.familyDocs);
  const profile = useSi((s) => s.profile);
  const addFamilyDoc = useSi((s) => s.addFamilyDoc);
  const signFamilyDoc = useSi((s) => s.signFamilyDoc);
  return (
    <div className="space-y-5">
      <p className="text-sm text-pretty">{t("house.careHint")}</p>
      <p className="text-sm text-wool">{t("house.careLaw")}</p>
      {profile?.familyContact && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-wool">{t("settings.familyContact")}</p>
          <p className="mt-1">{profile.familyContact}</p>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="secondary">
          <Link to="/archive">{t("house.careArchive")}</Link>
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            addFamilyDoc(t("house.careProxy"), t("house.careProxyBody"), 2);
            void playSound("ui_success");
          }}
        >
          {t("house.careProxy")}
        </Button>
      </div>
      {familyDocs.length > 0 && (
        <ul className="space-y-2">
          {familyDocs.map((d) => (
            <li key={d.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="font-display">{d.title}</div>
                <Badge tone={d.hash ? "gold" : "wool"}>
                  {d.signatures.length}/{d.required}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{d.body}</p>
              {!d.hash ? (
                <Button
                  size="sm"
                  className="mt-3"
                  variant="outline"
                  onClick={() => {
                    signFamilyDoc(d.id, "self");
                    void playSound("ui_tap");
                  }}
                >
                  {t("family.sign")}
                </Button>
              ) : (
                <p className="mt-2 break-all font-mono text-xs text-muted-foreground">{d.hash}</p>
              )}
            </li>
          ))}
        </ul>
      )}
      {docs.length === 0 ? (
        <Empty>{t("house.careEmpty")}</Empty>
      ) : (
        <ul className="space-y-2">
          {docs.map((d) => (
            <li key={d.id} className="rounded-2xl border border-border p-4">
              <div className="font-display">{d.title}</div>
              <p className="mt-1 break-all font-mono text-xs text-muted-foreground">{d.sha256}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AidRoom() {
  const t = useT();
  const aid = useSi((s) => s.aid);
  const add = useSi((s) => s.addAid);
  const remove = useSi((s) => s.removeAid);
  const [side, setSide] = useState<"need" | "offer">("need");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  return (
    <div className="space-y-5">
      <p className="text-sm text-pretty">{t("house.aidHint")}</p>
      <form
        className="space-y-3 rounded-2xl border border-border p-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim()) return;
          add(side, title.trim(), body.trim());
          setTitle("");
          setBody("");
        }}
      >
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className={cn("min-h-11 rounded-xl border", side === "need" ? "border-gold" : "border-border")}
            onClick={() => setSide("need")}
          >
            {t("house.need")}
          </button>
          <button
            type="button"
            className={cn("min-h-11 rounded-xl border", side === "offer" ? "border-gold" : "border-border")}
            onClick={() => setSide("offer")}
          >
            {t("house.offer")}
          </button>
        </div>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("archive.titleField")} />
        <textarea
          className="min-h-20 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <Button type="submit">{t("common.add")}</Button>
      </form>
      {aid.length === 0 ? (
        <Empty>{t("house.aidEmpty")}</Empty>
      ) : (
        <ul className="space-y-2">
          {aid.map((a) => (
            <li key={a.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-2">
                <Badge tone={a.side === "need" ? "gold" : "wool"}>
                  {a.side === "need" ? t("house.need") : t("house.offer")}
                </Badge>
                <button type="button" className="text-xs text-muted-foreground" onClick={() => remove(a.id)}>
                  {t("common.remove")}
                </button>
              </div>
              <div className="mt-2 font-display">{a.title}</div>
              {a.body && <p className="mt-1 text-sm text-pretty">{a.body}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Check({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
      <span>{label}</span>
      <span className={ok ? "text-wool" : "text-muted-foreground"}>{ok ? "●" : "○"}</span>
    </li>
  );
}

function EarnRoom() {
  const t = useT();
  const address = useSi((s) => s.address);
  const ledger = useSi((s) => s.ledger);
  const referral = useSi((s) => s.referral);
  const people = useSi((s) => s.people);
  const edges = useSi((s) => s.edges);
  const documents = useSi((s) => s.documents);
  const rsvps = useSi((s) => s.rsvps);
  const familyAirdropPaid = useSi((s) => s.familyAirdropPaid);
  const grants = useSi((s) => s.grants);
  const events = useSi((s) => s.events);
  const transfer = useSi((s) => s.transfer);
  const boostEvent = useSi((s) => s.boostEvent);
  const minor = people.find((p) => p.isSelf)?.isMinor;
  const born = people.find((p) => p.isSelf)?.createdAt ?? Date.now();
  const seven = Date.now() - born > 7 * 86400000;
  const parents = edges.filter((e) => (e.type === "parent" || e.type === "adoptive") && e.to === "self").length;
  const qualifies = documents.length > 0 || rsvps.length > 0 || seven;
  const earned = referral ? referrerEarnedInWindow(ledger, protocolAddress(`refholder:${referral.code}`)) : 0n;
  const cap = tokensToUnits(REFERRAL.monthlyCapTokens);
  const left = cap > earned ? cap - earned : 0n;
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [msg, setMsg] = useState("");

  function tip() {
    if (!isSiAddress(to)) {
      setMsg(t("wallet.badAddr"));
      return;
    }
    const units = parseAmountToUnits(amount);
    if (units === null || units <= 0n) return;
    const r = transfer(to, units, "mediator-tip");
    setMsg(r.ok ? t("earn.tipped") : t("wallet.noFunds"));
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-pretty">{t("earn.filter")}</p>
      <div className="grid grid-cols-2 gap-3">
        <Link to="/wallet" className="si-door min-h-20 p-3">
          <div className="font-display">{t("nav.wallet")}</div>
          <p className="mt-1 text-xs text-muted-foreground">{t("house.bankBlurb")}</p>
        </Link>
        <Link to="/silsila" className="si-door min-h-20 p-3">
          <div className="font-display">{t("nav.tree")}</div>
          <p className="mt-1 text-xs text-muted-foreground">{t("home.airdrop")}</p>
        </Link>
      </div>
      <ul className="divide-y divide-border rounded-2xl border border-border">
        <Check ok={!!address && !minor} label={t("earn.wallet")} />
        <Check ok={qualifies} label={t("earn.qualify")} />
        <Check ok={!!referral?.referredBy} label={t("earn.refApplied")} />
        <Check ok={!!referral?.qualified} label={t("earn.refPaid")} />
        <Check ok={parents >= 2 || familyAirdropPaid} label={`${t("earn.parents")} ${parents}/2`} />
      </ul>
      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-xs uppercase tracking-[0.16em] text-wool">{t("earn.cap")}</p>
        <p className="mt-1 font-display text-2xl tabular">{formatUnits(left, 0)}</p>
        <p className="text-sm text-muted-foreground">
          {REFERRAL.payoutTokens.toString()} SILAL · {t("earn.oneLevel")}
        </p>
        <Button asChild size="sm" variant="secondary" className="mt-3">
          <Link to="/referrals">{t("nav.referrals")}</Link>
        </Button>
      </div>
      <div className="rounded-2xl border border-border p-4">
        <p className="font-display">{FAMILY_AIRDROP_TOKENS.toString()} SILAL</p>
        <p className="mt-1 text-sm text-muted-foreground">{t("home.airdrop")}</p>
        <Button asChild size="sm" variant="secondary" className="mt-3">
          <Link to="/silsila">{t("nav.tree")}</Link>
        </Button>
      </div>
      <form
        className="space-y-3 rounded-2xl border border-border p-4"
        onSubmit={(e) => {
          e.preventDefault();
          tip();
        }}
      >
        <h2 className="font-display text-lg">{t("earn.tip")}</h2>
        <p className="text-sm text-muted-foreground">{t("earn.tipHint")}</p>
        <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="si1…" />
        <Input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" />
        <Button type="submit" disabled={!!minor}>
          {t("wallet.send")}
        </Button>
        {msg && <p className="text-sm text-wool">{msg}</p>}
      </form>
      <div className="space-y-3 rounded-2xl border border-border p-4">
        <h2 className="font-display text-lg">{t("earn.boost")}</h2>
        <p className="text-sm text-muted-foreground">{t("earn.boostHint")}</p>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("events.empty")}</p>
        ) : (
          <ul className="space-y-2">
            {events.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-2 text-sm">
                <span>{e.title}</span>
                {e.boosted ? (
                  <Badge tone="gold">{t("earn.boosted")}</Badge>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const r = boostEvent(e.id);
                      setMsg(r.ok ? t("earn.boosted") : t("wallet.noFunds"));
                    }}
                  >
                    1 SILAL
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        {t("house.grant")} · {grants.length}
      </p>
    </div>
  );
}

function LearnRoom() {
  const t = useT();
  const notes = useSi((s) => s.studyNotes);
  const add = useSi((s) => s.addStudy);
  const remove = useSi((s) => s.removeStudy);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  return (
    <div className="space-y-5">
      <p className="text-sm text-pretty">{t("learn.hint")}</p>
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="secondary">
          <Link to="/custom">{t("nav.custom")}</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link to="/cred">{t("nav.cred")}</Link>
        </Button>
      </div>
      <form
        className="space-y-3 rounded-2xl border border-border p-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim()) return;
          add(title.trim(), body.trim());
          setTitle("");
          setBody("");
        }}
      >
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("archive.titleField")} />
        <textarea
          className="min-h-24 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <Button type="submit">{t("common.add")}</Button>
      </form>
      {notes.length === 0 ? (
        <Empty>{t("learn.empty")}</Empty>
      ) : (
        <ul className="space-y-2">
          {notes.map((n) => (
            <li key={n.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="font-display">{n.title}</div>
                <button type="button" className="text-xs text-muted-foreground" onClick={() => remove(n.id)}>
                  {t("common.remove")}
                </button>
              </div>
              {n.body && <p className="mt-2 text-sm text-pretty">{n.body}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function LiveRoom() {
  const t = useT();
  const household = useSi((s) => s.household);
  const setHousehold = useSi((s) => s.setHousehold);
  const profile = useSi((s) => s.profile);
  const events = useSi((s) => s.events);
  const docs = useSi((s) => s.documents);
  const minor = useSi((s) => s.people.find((p) => p.isSelf)?.isMinor);
  const next = events
    .filter((e) => new Date(e.at).getTime() >= Date.now() - 86400000)
    .sort((a, b) => +new Date(a.at) - +new Date(b.at))[0];
  const [housing, setHousing] = useState(household.housing);
  const [travel, setTravel] = useState(household.travel);
  const [work, setWork] = useState(household.work);
  return (
    <div className="space-y-5">
      <p className="text-sm text-pretty">{t("live.hint")}</p>
      <div className="grid grid-cols-2 gap-3">
        <Link to="/events" className="si-door min-h-20 p-3">
          <div className="font-display">{t("nav.events")}</div>
          <p className="mt-1 text-xs text-muted-foreground">{t("house.liveBlurb")}</p>
        </Link>
        <Link to="/archive" className="si-door min-h-20 p-3">
          <div className="font-display">{t("nav.archive")}</div>
          <p className="mt-1 text-xs text-muted-foreground">{t("house.careHint")}</p>
        </Link>
      </div>
      {minor && <p className="text-sm text-wool">{t("ethics.p2")}</p>}
      {profile?.familyContact && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-wool">{t("settings.familyContact")}</p>
          <p className="mt-1">{profile.familyContact}</p>
        </div>
      )}
      {next && (
        <Link to="/events" className="block rounded-2xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-wool">{t("home.next")}</p>
          <div className="mt-1 font-display">{next.title}</div>
          <p className="text-sm text-muted-foreground">{next.place}</p>
        </Link>
      )}
      <form
        className="space-y-3 rounded-2xl border border-border p-4"
        onSubmit={(e) => {
          e.preventDefault();
          setHousehold({ housing, travel, work });
          void playSound("ui_success");
        }}
      >
        <Label>{t("live.housing")}</Label>
        <Input value={housing} onChange={(e) => setHousing(e.target.value)} />
        <Label>{t("live.travel")}</Label>
        <Input value={travel} onChange={(e) => setTravel(e.target.value)} />
        <Label>{t("house.work")}</Label>
        <Input value={work} onChange={(e) => setWork(e.target.value)} />
        <Button type="submit">{t("common.save")}</Button>
      </form>
      <div className="grid grid-cols-2 gap-3">
        <Link to="/archive" className="rounded-2xl border border-border bg-card p-4">
          <div className="font-display">{t("nav.archive")}</div>
          <div className="text-sm text-muted-foreground">{docs.length}</div>
        </Link>
        <Link to="/wallet" className="rounded-2xl border border-border bg-card p-4">
          <div className="font-display">{t("nav.wallet")}</div>
          <div className="text-sm text-muted-foreground">{t("live.papers")}</div>
        </Link>
      </div>
    </div>
  );
}

function Stone() {
  const t = useT();
  return (
    <ul className="space-y-1 rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
      <li>{t("found.supply")}</li>
      <li>{t("found.interest")}</li>
      <li>{t("found.license")}</li>
      <li>{t("found.plug")}</li>
    </ul>
  );
}

function BankRoom() {
  const t = useT();
  const address = useSi((s) => s.address);
  const ledger = useSi((s) => s.ledger);
  const pots = useSi((s) => s.pots);
  const qards = useSi((s) => s.qards);
  const addPot = useSi((s) => s.addPot);
  const depositPot = useSi((s) => s.depositPot);
  const withdrawPot = useSi((s) => s.withdrawPot);
  const addQard = useSi((s) => s.addQard);
  const repayQard = useSi((s) => s.repayQard);
  const [title, setTitle] = useState("");
  const [family, setFamily] = useState(false);
  const [amt, setAmt] = useState("");
  const [to, setTo] = useState("");
  const [qAmt, setQAmt] = useState("");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState("");
  const bal = address ? getBalance(ledger, address) : 0n;
  const mine = address
    ? ledger.txs.filter((tx) => tx.from === address || tx.to === address).slice(-12).reverse()
    : [];

  return (
    <div className="space-y-5">
      <p className="text-sm text-pretty">{t("bank.real")}</p>
      <Stone />
      {address && (
        <div className="rounded-2xl border border-gold/40 bg-card p-5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-gold">{t("bank.current")}</p>
          <p className="mt-2 font-mono text-sm">{accountNo(address)}</p>
          <p className="mt-1 font-display text-3xl tabular">{formatUnits(bal)}</p>
          <p className="text-sm text-muted-foreground">SILAL · {t("bank.noYield")}</p>
        </div>
      )}
      {mine.length > 0 && (
        <ul className="divide-y divide-border rounded-2xl border border-border">
          {mine.map((tx) => (
            <li key={tx.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <span className="truncate text-muted-foreground">{tx.memo || tx.kind}</span>
              <span className="tabular">{formatUnits(BigInt(tx.amount), 0)}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted-foreground">interestBps = {FOUNDATION.interestBps}</p>
      <form
        className="space-y-3 rounded-2xl border border-border p-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim()) return;
          addPot(title.trim(), family);
          setTitle("");
          setFamily(false);
        }}
      >
        <h2 className="font-display text-lg">{t("bank.pot")}</h2>
        <p className="text-sm text-muted-foreground">{t("bank.potHint")}</p>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("archive.titleField")} />
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" checked={family} onChange={(e) => setFamily(e.target.checked)} />
          {t("bank.familySeal")}
        </label>
        <Button type="submit">{t("common.add")}</Button>
      </form>
      {pots.map((p) => {
        const bal = getBalance(ledger, potAddress(p.id));
        return (
          <div key={p.id} className="space-y-2 rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="font-display">{p.title}</div>
              <div className="tabular">{formatUnits(bal)}</div>
            </div>
            {(p.required ?? 1) > 1 && <p className="text-xs text-wool">{t("bank.familySeal")}</p>}
            <p className="break-all font-mono text-[11px] text-muted-foreground">{potAddress(p.id)}</p>
            <div className="flex flex-wrap gap-2">
              <Input value={amt} onChange={(e) => setAmt(e.target.value)} inputMode="decimal" className="w-28" />
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  const u = parseAmountToUnits(amt);
                  if (u === null) return;
                  const r = depositPot(p.id, u);
                  setMsg(r.ok ? t("earn.tipped") : t("wallet.noFunds"));
                }}
              >
                {t("bank.in")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const u = parseAmountToUnits(amt);
                  if (u === null) return;
                  const r = withdrawPot(p.id, u);
                  setMsg(r.ok ? t("earn.tipped") : r.error === "seal" ? t("bank.needSeal") : t("wallet.noFunds"));
                }}
              >
                {t("bank.out")}
              </Button>
            </div>
          </div>
        );
      })}
      <form
        className="space-y-3 rounded-2xl border border-border p-4"
        onSubmit={(e) => {
          e.preventDefault();
          const u = parseAmountToUnits(qAmt);
          if (u === null) return;
          const r = addQard(to, u, note);
          setMsg(r.ok ? t("earn.tipped") : t("wallet.noFunds"));
          if (r.ok) {
            setTo("");
            setQAmt("");
            setNote("");
          }
        }}
      >
        <h2 className="font-display text-lg">{t("bank.qard")}</h2>
        <p className="text-sm text-muted-foreground">{t("bank.qardHint")}</p>
        <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="si1…" />
        <Input value={qAmt} onChange={(e) => setQAmt(e.target.value)} inputMode="decimal" />
        <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("wallet.memo")} />
        <Button type="submit">{t("wallet.send")}</Button>
      </form>
      {qards.length > 0 && (
        <ul className="space-y-2">
          {qards.map((q) => (
            <li key={q.id} className="rounded-2xl border border-border p-4 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate">{q.to}</span>
                <span className="tabular">{formatUnits(BigInt(q.amount))}</span>
              </div>
              {q.note && <p className="mt-1 text-muted-foreground">{q.note}</p>}
              {q.repaidAt ? (
                <Badge tone="wool">{t("bank.repaid")}</Badge>
              ) : (
                <Button size="sm" variant="ghost" className="mt-2" onClick={() => repayQard(q.id)}>
                  {t("bank.markRepaid")}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {msg && <p className="text-sm text-wool">{msg}</p>}
    </div>
  );
}

function InsureRoom() {
  const t = useT();
  const ledger = useSi((s) => s.ledger);
  const claims = useSi((s) => s.claims);
  const fileClaim = useSi((s) => s.fileClaim);
  const left = getBalance(ledger, fundAddress("insurance"));
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  return (
    <div className="space-y-5">
      <p className="text-sm text-pretty">{t("insure.hint")}</p>
      <Stone />
      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-xs uppercase tracking-[0.16em] text-wool">{t("house.insure")}</p>
        <p className="mt-1 font-display text-2xl tabular">{formatUnits(left)}</p>
        <p className="text-sm text-muted-foreground">{t("insure.fund")}</p>
      </div>
      <form
        className="space-y-3 rounded-2xl border border-border p-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim()) return;
          fileClaim(title.trim(), body.trim());
          setTitle("");
          setBody("");
        }}
      >
        <h2 className="font-display text-lg">{t("insure.file")}</h2>
        <p className="text-sm text-muted-foreground">{t("insure.fileHint")}</p>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea
          className="min-h-20 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <Button type="submit">{t("common.add")}</Button>
      </form>
      {claims.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("insure.empty")}</p>
      ) : (
        <ul className="space-y-2">
          {claims.map((c) => (
            <li key={c.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="font-display">{c.title}</div>
              {c.body && <p className="mt-1 text-sm text-pretty">{c.body}</p>}
              <p className="mt-2 break-all font-mono text-[11px] text-muted-foreground">{c.hash}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
