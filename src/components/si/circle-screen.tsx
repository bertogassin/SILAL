import { useState } from "react";
import { useSi } from "@/lib/si/store";
import { useT } from "@/lib/si/use-t";
import { playSound } from "@/lib/si/sounds";
import { copyText } from "@/lib/si/copy";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Empty } from "./empty";
import { PageHead } from "./page-head";
import { QrCode } from "./qr";

export function CircleScreen() {
  const t = useT();
  const circle = useSi((s) => s.circle);
  const code = useSi((s) => s.circleCode);
  const add = useSi((s) => s.addCircleMember);
  const setRole = useSi((s) => s.setCircleRole);
  const remove = useSi((s) => s.removeCircleMember);
  const guests = useSi((s) => s.guestCircles);
  const [name, setName] = useState("");
  const [asElder, setAsElder] = useState(false);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHead kicker={t("circle.title")} title={t("nav.circle")}>
        {t("circle.hint")} {t("co.officesHint")}
      </PageHead>
      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-xs uppercase tracking-[0.16em] text-wool">{t("circle.code")}</p>
        <QrCode value={`si://c/${code}`} label={code} />
        <div className="mt-1 flex items-center justify-between">
          <code>si://c/{code}</code>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              void copyText(`si://c/${code}`);
            }}
          >
            {t("common.copy")}
          </Button>
        </div>
      </div>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          add(name.trim(), asElder ? "elder" : "member");
          setName("");
        }}
      >
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("on.name")} />
        <Button type="submit">{t("circle.add")}</Button>
      </form>
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input type="checkbox" checked={asElder} onChange={(e) => setAsElder(e.target.checked)} />
        {t("circle.elder")}
      </label>
      {circle.length === 0 ? (
        <Empty>{t("circle.empty")}</Empty>
      ) : (
        <ul className="divide-y divide-border rounded-2xl border border-border">
          {circle.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <span>{m.name}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="text-xs text-wool"
                  onClick={() => setRole(m.id, m.role === "elder" ? "member" : "elder")}
                >
                  {m.role === "elder" ? t("circle.member") : t("circle.promote")}
                </button>
                <Badge>{m.role === "elder" ? t("circle.elder") : t("circle.member")}</Badge>
                <button type="button" className="text-xs text-muted-foreground" onClick={() => remove(m.id)}>
                  {t("common.remove")}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {guests.length > 0 && (
        <div>
          <p className="mb-2 text-xs uppercase tracking-[0.16em] text-wool">{t("circle.guest")}</p>
          <ul className="space-y-1 text-sm">
            {guests.map((g) => (
              <li key={g} className="font-mono">
                si://c/{g}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
