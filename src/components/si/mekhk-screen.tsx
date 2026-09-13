import { useState } from "react";
import { useSi } from "@/lib/si/store";
import { useT } from "@/lib/si/use-t";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Empty } from "./empty";
import { PageHead } from "./page-head";

export function MekhkScreen() {
  const t = useT();
  const cases = useSi((s) => s.cases);
  const addCase = useSi((s) => s.addCase);
  const consentCase = useSi((s) => s.consentCase);
  const writeProtocol = useSi((s) => s.writeProtocol);
  const agreeCase = useSi((s) => s.agreeCase);
  const withdrawCase = useSi((s) => s.withdrawCase);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");

  function create() {
    if (!title.trim() || !p1.trim() || !p2.trim()) return;
    addCase(title.trim(), [p1.trim(), p2.trim()]);
    setTitle("");
    setP1("");
    setP2("");
    setOpen(false);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-end justify-between gap-3">
        <PageHead kicker={t("mekhk.title")} title={t("nav.mekhk")}>
          {t("mekhk.hint")}
        </PageHead>
        <Button size="sm" className="mb-1 shrink-0" onClick={() => setOpen(true)}>
          {t("mekhk.new")}
        </Button>
      </div>
      {cases.length === 0 ? (
        <Empty>{t("mekhk.empty")}</Empty>
      ) : (
        <ul className="space-y-3">
          {cases.map((c) => (
            <li key={c.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-display text-lg">{c.title}</h2>
                <Badge tone={c.status === "agreed" ? "wool" : c.status === "withdrawn" ? "garnet" : "gold"}>
                  {c.status === "agreed" ? t("mekhk.agreed") : c.status === "open" ? t("mekhk.open") : t("mekhk.withdraw")}
                </Badge>
              </div>
              <p className="mt-2 text-xs uppercase tracking-[0.16em] text-wool">{t("mekhk.parties")}</p>
              <ul className="mt-1 space-y-1">
                {c.parties.map((p, i) => (
                  <li key={`${c.id}-${i}`} className="flex items-center justify-between text-sm">
                    <span>{p.name}</span>
                    {c.status === "open" && !p.consented ? (
                      <button type="button" className="text-gold" onClick={() => consentCase(c.id, i)}>
                        {t("mekhk.consent")}
                      </button>
                    ) : (
                      <span className="text-wool">{t("mekhk.consent")}</span>
                    )}
                  </li>
                ))}
              </ul>
              {c.status === "open" && (
                <>
                  <Label className="mt-3">{t("mekhk.protocol")}</Label>
                  <textarea
                    className="mt-1 min-h-24 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    value={c.protocol}
                    onChange={(e) => writeProtocol(c.id, e.target.value)}
                  />
                  <p className="mt-2 text-xs text-muted-foreground">{t("mekhk.needConsent")}</p>
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" onClick={() => agreeCase(c.id)}>
                      {t("mekhk.agree")}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => withdrawCase(c.id)}>
                      {t("mekhk.withdraw")}
                    </Button>
                  </div>
                </>
              )}
              {c.hash && <p className="mt-2 break-all font-mono text-xs text-muted-foreground">{c.hash}</p>}
            </li>
          ))}
        </ul>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("mekhk.new")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label>{t("archive.titleField")}</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            <Label>{t("mekhk.parties")}</Label>
            <Input value={p1} onChange={(e) => setP1(e.target.value)} />
            <Input value={p2} onChange={(e) => setP2(e.target.value)} />
            <Button className="w-full" onClick={create}>
              {t("common.add")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
