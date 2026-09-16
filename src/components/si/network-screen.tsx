import { useState } from "react";
import { useSi, getBalance, fundAddress } from "@/lib/si/store";
import { useT } from "@/lib/si/use-t";
import { formatUnits, FUNDS, fundUnits } from "@/lib/si/tokenomics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { playSound } from "@/lib/si/sounds";
import { PageHead } from "./page-head";

export function NetworkScreen() {
  const t = useT();
  const ledger = useSi((s) => s.ledger);
  const endpoint = useSi((s) => s.networkEndpoint);
  const setEndpoint = useSi((s) => s.setNetworkEndpoint);
  const tryConnect = useSi((s) => s.tryConnectNetwork);
  const [draft, setDraft] = useState(endpoint);
  const [msg, setMsg] = useState("");
  const liq = getBalance(ledger, fundAddress("liquidity"));

  function connect() {
    setEndpoint(draft.trim());
    const r = tryConnect();
    setMsg(r.ok ? t("net.live") : t("net.offline"));
    void playSound(r.ok ? "ui_success" : "ui_warn");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHead kicker={t("net.title")} title={t("nav.network")}>
        {t("net.hint")}
      </PageHead>
      <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3">
        <span className="text-sm">{t("net.status")}</span>
        <Badge tone="gold">{t("net.local")}</Badge>
      </div>
      <div className="space-y-3 rounded-2xl border border-border p-4">
        <Label>{t("net.endpoint")}</Label>
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="si://net/…"
        />
        <Button variant="secondary" onClick={connect}>
          {t("net.connect")}
        </Button>
        {msg && <p className="text-sm text-wool">{msg}</p>}
      </div>
      <section className="space-y-2">
        <h2 className="font-display text-2xl">{t("net.liquidity")}</h2>
        <p className="text-sm text-muted-foreground">{t("net.liqHint")}</p>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-wool">{t("fund.liquidity")}</p>
          <p className="mt-1 font-display text-3xl tabular">{formatUnits(liq, 0)}</p>
          <p className="text-sm text-muted-foreground">
            / {formatUnits(fundUnits("liquidity"), 0)} · {FUNDS.liquidity.rule}
          </p>
        </div>
      </section>
    </div>
  );
}
