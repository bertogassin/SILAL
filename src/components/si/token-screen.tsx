import { FUND_ORDER, FUNDS, formatUnits, fundUnits } from "@/lib/si/tokenomics";
import { useT } from "@/lib/si/use-t";
import type { MessageKey } from "@/lib/si/i18n";
import { getBalance, fundAddress } from "@/lib/si/ledger";
import { useSi } from "@/lib/si/store";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { PageHead } from "./page-head";

export function TokenScreen() {
  const t = useT();
  const ledger = useSi((s) => s.ledger);
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHead kicker={t("token.title")} title="10 000 000 000">
        <span className="si-brand text-xs">SILAL</span>
        {" · "}
        {t("token.supply")}
      </PageHead>
      <p className="text-sm text-pretty">{t("token.fixed")}</p>
      <p className="text-sm text-pretty">{t("token.notShare")}</p>
      <p className="text-sm text-pretty">{t("token.notRating")}</p>
      <p className="text-sm text-muted-foreground">{t("token.use")}</p>
      <ul className="divide-y divide-border rounded-2xl border border-border text-sm">
        <li className="flex justify-between px-4 py-3">
          <span>{t("found.interest")}</span>
          <span className="tabular text-wool">0</span>
        </li>
        <li className="flex justify-between px-4 py-3">
          <span>{t("token.fixed")}</span>
          <span className="tabular text-wool">10B</span>
        </li>
      </ul>
      <Button asChild variant="secondary">
        <Link to="/house">{t("nav.house")}</Link>
      </Button>
      <ul className="overflow-hidden rounded-2xl border border-border">
        {FUND_ORDER.map((id) => {
          const f = FUNDS[id];
          const remaining = getBalance(ledger, fundAddress(id));
          const orig = fundUnits(id);
          const pct = f.bps / 100;
          return (
            <li key={id} className="border-b border-border px-4 py-3 last:border-0">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium">{t(`fund.${id}` as MessageKey)}</div>
                  <div className="text-xs text-muted-foreground">{t(`fund.${id}.rule` as MessageKey)}</div>
                </div>
                <div className="text-right">
                  <div className="tabular text-sm">{pct}%</div>
                  <div className="tabular text-xs text-muted-foreground">
                    {formatUnits(remaining, 0)} / {formatUnits(fundUnits(id), 0)}
                  </div>
                </div>
              </div>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-stone">
                <div
                  className="h-full bg-gold/80"
                  style={{
                    width: `${orig === 0n ? 0 : Number((remaining * 1000n) / orig) / 10}%`,
                  }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
