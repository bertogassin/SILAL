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
  const [busy, setBusy] = useState(false);
  const liq = getBalance(ledger, fundAddress("liquidity"));

  function probeUrl(endpointValue: string, peer: string): URL {
    const trimmed = endpointValue.trim();
    const url =
      trimmed && /^https?:\/\//i.test(trimmed)
        ? new URL(trimmed)
        : new URL("/api/rtc", window.location.origin);
    url.searchParams.set("room", "network-probe");
    url.searchParams.set("peer", peer);
    url.searchParams.set("name", "probe");
    url.searchParams.set("since", "0");
    return url;
  }

  async function connect() {
    const next = draft.trim();
    setEndpoint(next);
    const r = tryConnect();
    if (!r.ok) {
      setMsg(t("net.offline"));
      void playSound("ui_warn");
      return;
    }
    setBusy(true);
    try {
      const peer = `probe-${Math.random().toString(36).slice(2, 10)}`;
      const url = probeUrl(next, peer);
      const res = await fetch(url);
      if (!res.ok) throw new Error("offline");
      const body = (await res.json()) as { token?: string };
      if (body.token) {
       await fetch(url, {
         method: "POST",
         headers: { "content-type": "application/json" },
         body: JSON.stringify({
           op: "leave",
           room: "network-probe",
           peer,
           token: body.token,
         }),
       });
      }
      setMsg(t("net.live"));
      void playSound("ui_success");
    } catch {
      setMsg(t("net.offline"));
      void playSound("ui_warn");
    } finally {
      setBusy(false);
    }
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
        <Button variant="secondary" onClick={() => void connect()} disabled={busy}>
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
