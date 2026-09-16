import { useSi } from "@/lib/si/store";
import { generationOf, type Person } from "@/lib/si/silsila";
import { useT } from "@/lib/si/use-t";
import { cn } from "@/lib/utils";

export function TreeView({ onSelect }: { onSelect?: (id: string) => void }) {
  const people = useSi((s) => s.people);
  const edges = useSi((s) => s.edges);
  const t = useT();
  const self = people.find((p) => p.isSelf);
  if (!self) return null;

  const gens = new Map<number, Person[]>();
  for (const p of people) {
    const g = generationOf(p.id, self.id, edges);
    const key = g ?? 99;
    const arr = gens.get(key) ?? [];
    arr.push(p);
    gens.set(key, arr);
  }
  const keys = [...gens.keys()].filter((k) => k !== 99).sort((a, b) => a - b);
  const unlinked = gens.get(99) ?? [];

  if (people.length === 1) {
    return (
      <div className="rounded-2xl border border-dashed border-border px-4 py-10 text-center">
        <p className="font-display text-lg">{t("silsila.empty")}</p>
        <p className="mt-2 text-sm text-muted-foreground">{t("home.emptyTree")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {keys.map((g) => (
        <div key={g}>
          <p className="mb-2 text-center text-[11px] uppercase tracking-[0.18em] text-wool">
            {g === 0 ? t("silsila.self") : g < 0 ? `${t("silsila.ancestor")} ${Math.abs(g)}` : `${t("silsila.addChild")} ${g}`}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {gens.get(g)!.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelect?.(p.id)}
                className={cn(
                  "min-w-24 rounded-xl border px-3 py-2 text-left",
                  p.isSelf ? "border-gold bg-card" : "border-border bg-card/70",
                )}
              >
                <div className="font-medium leading-tight">{p.name}</div>
                <div className="text-[11px] text-muted-foreground">
                  {p.living ? t("silsila.living") : t("silsila.ancestor")}
                  {p.living && !p.consentToPublish && !p.isSelf ? " · " + t("silsila.consent") : ""}
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
      {unlinked.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2 opacity-80">
          {unlinked.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelect?.(p.id)}
              className="rounded-xl border border-dashed border-border px-3 py-2 text-sm"
            >
              {p.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
