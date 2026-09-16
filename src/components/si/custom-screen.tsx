import { useT } from "@/lib/si/use-t";
import type { MessageKey } from "@/lib/si/i18n";
import { PageHead } from "./page-head";

const ARTICLES: { title: MessageKey; body: MessageKey }[] = [
  { title: "custom.adat.title", body: "custom.adat" },
  { title: "custom.kinship.title", body: "custom.kinship" },
  { title: "custom.consent.title", body: "custom.consent" },
  { title: "custom.mekhk.title", body: "custom.mekhk" },
  { title: "custom.nofeud.title", body: "custom.nofeud" },
  { title: "custom.nine.title", body: "custom.nine" },
  { title: "custom.qard.title", body: "custom.qard" },
  { title: "custom.guest.title", body: "custom.guest" },
];

export function CustomScreen() {
  const t = useT();
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHead kicker={t("custom.title")} title={t("nav.custom")}>
        {t("custom.law")}
      </PageHead>
      <ul className="space-y-3">
        {ARTICLES.map((a) => (
          <li key={a.title} className="rounded-2xl border border-border bg-card p-4">
            <h2 className="font-display text-lg">{t(a.title)}</h2>
            <p className="mt-2 text-sm text-pretty">{t(a.body)}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
