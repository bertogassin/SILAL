import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useSi } from "@/lib/si/store";
import { useT } from "@/lib/si/use-t";
import { FIND_ROOMS, findHits } from "@/lib/si/find";
import { Input } from "@/components/ui/input";
import { playSound } from "@/lib/si/sounds";

export function FindBar() {
  const t = useT();
  const nav = useNavigate();
  const people = useSi((s) => s.people);
  const events = useSi((s) => s.events);
  const circle = useSi((s) => s.circle);
  const [q, setQ] = useState("");
  const [dq, setDq] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const id = window.setTimeout(() => setDq(q), 80);
    return () => window.clearTimeout(id);
  }, [q]);

  const hits = useMemo(
    () =>
      findHits(dq, {
        rooms: FIND_ROOMS.map((r) => ({ href: r.href, label: t(r.key) })),
        people: people.map((p) => ({ id: p.id, name: p.name })),
        events: events.map((e) => ({ id: e.id, title: e.title })),
        circle: circle.map((m) => ({ id: m.id, name: m.name })),
      }),
    [dq, people, events, circle, t],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (e.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA") {
        e.preventDefault();
        ref.current?.focus();
        setOpen(true);
      }
      if (e.key === "Escape") {
        setOpen(false);
        ref.current?.blur();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="relative mb-3">
      <label className="si-find">
        <Search className="size-4 shrink-0 text-wool" aria-hidden />
        <Input
          ref={ref}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          placeholder={t("find.ph")}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          aria-label={t("find.ph")}
          className="h-10 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
        />
      </label>
      {open && hits.length > 0 && (
        <ul className="si-panel absolute z-30 mt-1 w-full overflow-hidden">
          {hits.map((h) => (
            <li key={h.id} className="border-b border-border last:border-0">
              <button
                type="button"
                className="flex min-h-11 w-full items-center justify-between gap-3 px-3 text-left text-sm"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  void playSound("ui_tap");
                  void nav({ to: h.href });
                  setQ("");
                  setOpen(false);
                }}
              >
                <span>{h.label}</span>
                <span className="si-kicker">{t(h.kicker)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}