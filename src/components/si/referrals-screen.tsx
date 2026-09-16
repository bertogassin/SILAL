import { useState } from "react";
import { useSi } from "@/lib/si/store";
import { useT } from "@/lib/si/use-t";
import { playSound } from "@/lib/si/sounds";
import { copyText } from "@/lib/si/copy";
import { REFERRAL } from "@/lib/si/tokenomics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { QrCode } from "./qr";
import { PageHead } from "./page-head";

export function ReferralsScreen() {
  const t = useT();
  const referral = useSi((s) => s.referral);
  const applyInvite = useSi((s) => s.applyInvite);
  const [raw, setRaw] = useState("");
  const [msg, setMsg] = useState("");

  function apply() {
    const r = applyInvite(raw);
    if (!r.ok) {
      setMsg(r.error === "self" ? t("ref.self") : t("ref.bad"));
      void playSound("ui_warn");
      return;
    }
    setMsg(t("ref.held"));
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHead kicker={t("ref.title")} title={t("nav.referrals")}>
        {t("ref.depth")} {t("custom.nine")}
      </PageHead>
      <div className="rounded-2xl border border-gold/40 bg-card p-5">
        <p className="text-xs uppercase tracking-[0.16em] text-wool">{t("ref.code")}</p>
        <div className="mt-2 font-display text-3xl tracking-wide">{referral?.code}</div>
        {referral && <QrCode value={`si://r/${referral.code}`} label={referral.code} />}
        <Button
          className="mt-3"
          size="sm"
          variant="secondary"
          onClick={() => {
            if (referral) void copyText(`si://r/${referral.code}`);
          }}
        >
          {t("common.copy")} si://r/{referral?.code}
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">{t("ref.split")}</p>
      <p className="text-sm text-muted-foreground">{t("ref.need")}</p>
      {referral?.referredBy ? (
        <div className="flex items-center gap-2">
          <span className="text-sm">{referral.referredBy}</span>
          <Badge tone={referral.qualified ? "wool" : "gold"}>
            {referral.qualified ? t("ref.qualified") : t("ref.pending")}
          </Badge>
        </div>
      ) : null}
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          apply();
        }}
      >
        <Input
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder={t("ref.any")}
        />
        <Button type="submit">{t("ref.apply")}</Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            void navigator.clipboard.readText().then((text) => {
              setRaw(text);
            });
          }}
        >
          {t("ref.paste")}
        </Button>
      </form>
      {msg && <p className="text-sm text-wool">{msg}</p>}
      <p className="text-xs text-muted-foreground">
        {REFERRAL.payoutTokens.toString()} SILAL · cap {REFERRAL.monthlyCapTokens.toString()} / 30d · depth {REFERRAL.depth}
      </p>
    </div>
  );
}
