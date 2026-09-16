import { useState } from "react";
import { useSi, type CredKind } from "@/lib/si/store";
import { useT } from "@/lib/si/use-t";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { playSound } from "@/lib/si/sounds";
import { copyText } from "@/lib/si/copy";
import { verifyUtf8Hex } from "@/lib/si/crypto";
import { Empty } from "./empty";
import { PageHead } from "./page-head";

const kinds: CredKind[] = ["diploma", "guarantee", "membership"];

export function CredScreen() {
  const t = useT();
  const creds = useSi((s) => s.creds);
  const issueCred = useSi((s) => s.issueCred);
  const revealCred = useSi((s) => s.revealCred);
  const revokeCred = useSi((s) => s.revokeCred);
  const unlocked = useSi((s) => s.session.unlocked);
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<CredKind>("diploma");
  const [subject, setSubject] = useState("");
  const [claim, setClaim] = useState("");
  const [err, setErr] = useState("");
  const [raw, setRaw] = useState("");
  const [vmsg, setVmsg] = useState("");

  const kindLabel: Record<CredKind, string> = {
    diploma: t("cred.diploma"),
    guarantee: t("cred.guarantee"),
    membership: t("cred.membership"),
  };

  function issue() {
    setErr("");
    if (!unlocked) {
      setErr(t("cred.lock"));
      return;
    }
    if (!subject.trim() || !claim.trim()) return;
    const r = issueCred(kind, subject.trim(), claim.trim());
    if (!r.ok) {
      setErr(t("cred.lock"));
      void playSound("ui_warn");
      return;
    }
    setSubject("");
    setClaim("");
    setOpen(false);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-end justify-between gap-3">
        <PageHead kicker={t("cred.title")} title={t("nav.cred")}>
          {t("cred.hint")}
        </PageHead>
        <Button size="sm" className="mb-1 shrink-0" onClick={() => setOpen(true)}>
          {t("cred.issue")}
        </Button>
      </div>
      {creds.length === 0 ? (
        <Empty>{t("cred.empty")}</Empty>
      ) : (
        <ul className="space-y-3">
          {creds.map((c) => (
            <li key={c.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="font-display text-lg">{c.subjectName}</div>
                <Badge tone={c.revoked ? "garnet" : c.revealed ? "wool" : "gold"}>
                  {c.revoked ? t("cred.revoked") : c.revealed ? kindLabel[c.kind] : t("cred.hidden")}
                </Badge>
              </div>
              {c.revealed && !c.revoked ? (
                <p className="mt-2 text-sm text-pretty">{c.claim}</p>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">{kindLabel[c.kind]}</p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {!c.revoked && (
                  <Button size="sm" variant="secondary" onClick={() => revealCred(c.id, !c.revealed)}>
                    {c.revealed ? t("cred.hide") : t("cred.reveal")}
                  </Button>
                )}
                {!c.revoked && (
                  <Button size="sm" variant="ghost" onClick={() => revokeCred(c.id)}>
                    {t("cred.revoke")}
                  </Button>
                )}
                {c.revealed && !c.revoked && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      void copyText(
                        JSON.stringify({
                          payload: c.payload,
                          signatureHex: c.signatureHex,
                          issuerPublicKeyHex: c.issuerPublicKeyHex,
                          issuerAddress: c.issuerAddress,
                        }),
                        { secret: true },
                      );
                    }}
                  >
                    {t("cred.copy")}
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      <form
        className="space-y-3 rounded-2xl border border-border p-4"
        onSubmit={(e) => {
          e.preventDefault();
          try {
            const j = JSON.parse(raw) as {
              payload?: string;
              signatureHex?: string;
              issuerPublicKeyHex?: string;
            };
            const ok =
              !!j.payload &&
              !!j.signatureHex &&
              !!j.issuerPublicKeyHex &&
              verifyUtf8Hex(j.issuerPublicKeyHex, j.payload, j.signatureHex);
            setVmsg(ok ? t("cred.verifyOk") : t("cred.verifyBad"));
          } catch {
            setVmsg(t("cred.verifyBad"));
          }
        }}
      >
        <h2 className="font-display text-lg">{t("cred.verify")}</h2>
        <textarea
          className="min-h-24 w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-xs"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
        />
        <Button type="submit" variant="secondary">
          {t("cred.verify")}
        </Button>
        {vmsg && <p className="text-sm text-wool">{vmsg}</p>}
      </form>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("cred.issue")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {kinds.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  className={cn("h-10 rounded-lg border text-sm", kind === k ? "border-gold" : "border-border")}
                >
                  {kindLabel[k]}
                </button>
              ))}
            </div>
            <Label>{t("cred.subject")}</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
            <Label>{t("cred.claim")}</Label>
            <Input value={claim} onChange={(e) => setClaim(e.target.value)} />
            {err && <p className="text-sm text-garnet">{err}</p>}
            <Button className="w-full" onClick={issue}>
              {t("cred.issue")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
