import { useState } from "react";
import { Copy } from "lucide-react";
import { formatUnits, parseAmountToUnits } from "@/lib/si/tokenomics";
import { useSi, getBalance } from "@/lib/si/store";
import { useT } from "@/lib/si/use-t";
import { localeTag } from "@/lib/si/i18n";
import { isSiAddress, signUtf8Hex, verifyUtf8Hex } from "@/lib/si/crypto";
import { parseInvite } from "@/lib/si/referral";
import { playSound } from "@/lib/si/sounds";
import { copyText } from "@/lib/si/copy";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QrCode } from "./qr";
import { PageHead } from "./page-head";
import { Link } from "@tanstack/react-router";
import { accountNo } from "@/lib/si/office";

export function WalletScreen() {
  const t = useT();
  const locale = useSi((s) => s.locale);
  const address = useSi((s) => s.address);
  const ledger = useSi((s) => s.ledger);
  const transfer = useSi((s) => s.transfer);
  const session = useSi((s) => s.session);
  const people = useSi((s) => s.people);
  const balance = address ? getBalance(ledger, address) : 0n;
  const txsAll = useSi((s) => s.ledger.txs);
  const txs = address ? txsAll.filter((tx) => tx.to === address || tx.from === address) : txsAll;
  const minor = people.find((p) => p.isSelf)?.isMinor;
  const family = people.filter((p) => p.walletAddress && p.walletAddress !== address && !p.isMinor);
  const cryptoProvider = useSi((s) => s.cryptoProvider);

  const [sendOpen, setSendOpen] = useState(false);
  const [recvOpen, setRecvOpen] = useState(false);
  const [seedOpen, setSeedOpen] = useState(false);
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [err, setErr] = useState("");
  const [ask, setAsk] = useState("");
  const [note, setNote] = useState("");
  const [sig, setSig] = useState("");
  const [pub, setPub] = useState("");
  const [sigMsg, setSigMsg] = useState("");

  function send() {
    setErr("");
    if (!isSiAddress(to)) {
      setErr(t("wallet.badAddr"));
      return;
    }
    const units = parseAmountToUnits(amount);
    if (units === null || units <= 0n) {
      setErr(t("wallet.amount"));
      return;
    }
    const r = transfer(to, units, memo);
    if (!r.ok) {
      setErr(r.error === "funds" ? t("wallet.noFunds") : t("wallet.badAddr"));
      void playSound("ui_warn");
      return;
    }
    setSendOpen(false);
    setTo("");
    setAmount("");
    setMemo("");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHead kicker={t("nav.wallet")} title={formatUnits(balance)}>
        <span className="si-brand text-xs">SILAL</span>
        {" · "}
        <span className="text-wool">{t("wallet.dev")}</span>
        {" · "}
        {cryptoProvider === "hybrid" ? t("hybrid.hybrid") : t("hybrid.classic")}
      </PageHead>

      {minor ? (
        <p className="rounded-2xl border border-border p-4 text-sm text-muted-foreground">{t("ethics.p2")}</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Button onClick={() => setSendOpen(true)}>{t("wallet.send")}</Button>
          <Button variant="secondary" onClick={() => setRecvOpen(true)}>
            {t("wallet.receive")}
          </Button>
        </div>
      )}

      <Card>
        <CardContent className="p-4">
          <p className="mb-1 text-xs uppercase tracking-[0.16em] text-wool">{t("wallet.address")}</p>
          {address && <p className="mb-2 font-mono text-sm">{accountNo(address)}</p>}
          <div className="flex items-start gap-2">
            <code className="flex-1 break-all text-xs">{address}</code>
            <button
              type="button"
              className="size-11 text-gold"
              aria-label={t("common.copy")}
              onClick={() => {
                if (address) void copyText(address);
              }}
            >
              <Copy className="mx-auto size-4" />
            </button>
          </div>
          <Button asChild size="sm" variant="outline" className="mt-3">
            <Link to="/house">{t("house.bank")}</Link>
          </Button>
        </CardContent>
      </Card>

      <section>
        <h2 className="mb-3 text-sm uppercase tracking-[0.16em] text-wool">{t("wallet.history")}</h2>
        {txs.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("wallet.empty")}</p>
        ) : (
          <ul className="divide-y divide-border rounded-2xl border border-border">
            {txs.slice(0, 20).map((tx) => {
              const incoming = tx.to === address;
              return (
                <li key={tx.id} className="flex items-center justify-between px-4 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm">{tx.memo || tx.kind}</div>
                    <div className="truncate text-xs text-muted-foreground">
                    {new Date(tx.ts).toLocaleString(localeTag(locale))} · {incoming ? tx.from : tx.to}
                    </div>
                  </div>
                  <div className={incoming ? "tabular text-wool" : "tabular"}>
                    {incoming ? "+" : "−"}
                    {formatUnits(BigInt(tx.amount))}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <Button variant="ghost" className="w-full" onClick={() => setSeedOpen(true)}>
        {t("wallet.backup")}
      </Button>
      <p className="text-xs text-muted-foreground">{t("wallet.fee")}</p>

      <Dialog open={sendOpen} onOpenChange={setSendOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("wallet.send")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label>{t("wallet.to")}</Label>
            <Input
              value={to}
              onChange={(e) => {
                const v = e.target.value;
                const p = parseInvite(v);
                if (p?.kind === "pay") {
                  setTo(p.code);
                  if (p.extra) setAmount(p.extra);
                  return;
                }
                setTo(v);
              }}
              placeholder="si1… / si://pay/…"
            />
            {family.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <span className="w-full text-xs text-muted-foreground">{t("wallet.family")}</span>
                {family.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="rounded-xl border border-border px-3 py-2 text-sm"
                    onClick={() => setTo(p.walletAddress!)}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            )}
            <Label>{t("wallet.amount")}</Label>
            <Input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" />
            <Label>{t("wallet.memo")}</Label>
            <Input value={memo} onChange={(e) => setMemo(e.target.value)} />
            {err && <p className="text-sm text-garnet">{err}</p>}
            <Button className="w-full" onClick={send}>
              {t("wallet.confirm")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={recvOpen} onOpenChange={setRecvOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("wallet.receive")}</DialogTitle>
          </DialogHeader>
          {address && (
            <QrCode
              value={ask.trim() ? `si://pay/${address}/${ask.trim()}` : address}
              label={t("wallet.address")}
            />
          )}
          <Label>{t("wallet.request")}</Label>
          <Input value={ask} onChange={(e) => setAsk(e.target.value)} inputMode="decimal" />
          <code className="block break-all text-center text-xs">
            {ask.trim() ? `si://pay/${address}/${ask.trim()}` : address}
          </code>
        </DialogContent>
      </Dialog>

      <Dialog open={seedOpen} onOpenChange={setSeedOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("wallet.backup")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-wool">{t("on.seedWarn")}</p>
          <ol className="seed-secure mt-3 grid grid-cols-2 gap-2">
            {(session.mnemonic ?? "").split(" ").filter(Boolean).map((w, i) => (
              <li key={i} className="rounded-xl border border-border bg-background px-3 py-2 text-sm">
                <span className="mr-2 text-xs text-gold">{i + 1}</span>
                {w}
              </li>
            ))}
          </ol>
        </DialogContent>
      </Dialog>

      <section className="space-y-3 rounded-2xl border border-border p-4">
        <h2 className="font-display text-lg">{t("wallet.sign")}</h2>
        <Label>{t("wallet.message")}</Label>
        <Input value={note} onChange={(e) => setNote(e.target.value)} />
        <Button
          variant="secondary"
          disabled={!session.secretKeyHex || !note}
          onClick={() => {
            if (!session.secretKeyHex) return;
            const hex = signUtf8Hex(session.secretKeyHex, note);
            setSig(hex);
            void copyText(hex, { secret: true });
          }}
        >
          {t("wallet.sign")}
        </Button>
        {sig && <p className="break-all font-mono text-xs text-muted-foreground">{sig}</p>}
        <h2 className="pt-2 font-display text-lg">{t("wallet.verify")}</h2>
        <Label>{t("wallet.pubkey")}</Label>
        <Input value={pub} onChange={(e) => setPub(e.target.value)} />
        <Label>{t("wallet.signature")}</Label>
        <Input value={sig} onChange={(e) => setSig(e.target.value)} />
        <Button
          variant="outline"
          onClick={() => {
            const key = pub.trim() || session.publicKeyHex || "";
            const ok = key && note && sig ? verifyUtf8Hex(key, note, sig) : false;
            setSigMsg(ok ? t("wallet.sigOk") : t("wallet.sigBad"));
          }}
        >
          {t("wallet.verify")}
        </Button>
        {sigMsg && <p className="text-sm text-wool">{sigMsg}</p>}
      </section>
    </div>
  );
}
