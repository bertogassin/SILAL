import { useState } from "react";
import { useSi } from "@/lib/si/store";
import { useT } from "@/lib/si/use-t";
import { localeTag } from "@/lib/si/i18n";
import type { UserEvent } from "@/lib/si/events-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { playSound } from "@/lib/si/sounds";
import { copyText } from "@/lib/si/copy";
import { Empty } from "./empty";
import { PageHead } from "./page-head";

function icsFor(e: UserEvent): string {
  const start = new Date(e.at);
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const esc = (s: string) => s.replace(/[,;\\]/g, "\\$&").replace(/\n/g, "\\n");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//si//events//EN",
    "BEGIN:VEVENT",
    `UID:${e.id}@si`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${esc(e.title)}`,
    `LOCATION:${esc(e.place)}`,
    `DESCRIPTION:${esc(e.note)}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

export function EventsScreen() {
  const t = useT();
  const locale = useSi((s) => s.locale);
  const events = useSi((s) => s.events);
  const rsvps = useSi((s) => s.rsvps);
  const rsvp = useSi((s) => s.rsvp);
  const unrsvp = useSi((s) => s.unrsvp);
  const reminders = useSi((s) => s.reminders);
  const setRemind = useSi((s) => s.setRemind);
  const addEvent = useSi((s) => s.addEvent);
  const removeEvent = useSi((s) => s.removeEvent);
  const hidden = useSi((s) => s.profile?.hiddenProfile);
  const profile = useSi((s) => s.profile);
  const [onlyGoing, setOnlyGoing] = useState(false);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [place, setPlace] = useState("");
  const [at, setAt] = useState("");
  const [note, setNote] = useState("");
  const [inviteOnly, setInviteOnly] = useState(false);
  const [q, setQ] = useState("");
  const [focus, setFocus] = useState<string | null>(null);
  const list = (onlyGoing ? events.filter((e) => rsvps.includes(e.id)) : events).filter(
    (e) =>
      !q.trim() ||
      `${e.title} ${e.place} ${e.note}`.toLowerCase().includes(q.trim().toLowerCase()),
  );

  function save() {
    if (!title.trim() || !place.trim()) return;
    const when = at ? new Date(at) : new Date(Date.now() + 7 * 86400000);
    if (Number.isNaN(when.getTime())) return;
    addEvent({
      title: title.trim(),
      place: place.trim(),
      at: when.toISOString(),
      inviteOnly,
      host: hidden ? "—" : (profile?.name ?? "si"),
      note: note.trim(),
    });
    setTitle("");
    setPlace("");
    setAt("");
    setNote("");
    setInviteOnly(false);
    setOpen(false);
  }

  function downloadIcs(e: UserEvent) {
    const blob = new Blob([icsFor(e)], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${e.id}.ics`;
    a.click();
    URL.revokeObjectURL(url);
    void playSound("ui_tap");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-end justify-between gap-3">
        <PageHead kicker={t("events.title")} title={t("nav.events")}>
          {t("events.mapHint")}
        </PageHead>
        <Button size="sm" className="mb-1 shrink-0" onClick={() => setOpen(true)}>
          {t("events.create")}
        </Button>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-border bg-card">
        <div className="si-ridge absolute inset-0 opacity-80" />
        <div className="relative aspect-[16/10]">
          {events.map((e) => (
            <button
              key={e.id}
              type="button"
              className={cn(
                "absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-gold",
                rsvps.includes(e.id) ? "bg-gold" : "bg-wool/70",
                focus === e.id ? "ring-2 ring-gold" : "",
              )}
              style={{ left: `${e.x}%`, top: `${e.y}%` }}
              title={e.place}
              onClick={() => {
                setFocus(e.id);
                document.getElementById(`ev-${e.id}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
              }}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setOnlyGoing(false)}
          className={cn("h-11 rounded-xl border text-sm", !onlyGoing ? "border-gold bg-card" : "border-border")}
        >
          {t("events.allFilter")}
        </button>
        <button
          type="button"
          onClick={() => setOnlyGoing(true)}
          className={cn("h-11 rounded-xl border text-sm", onlyGoing ? "border-gold bg-card" : "border-border")}
        >
          {t("events.goingFilter")}
        </button>
      </div>

      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("events.search")} />

      {list.length === 0 ? (
        <Empty>{t("events.empty")}</Empty>
      ) : (
        <ul className="space-y-3">
          {list.map((e) => {
            const going = rsvps.includes(e.id);
            return (
              <li
                key={e.id}
                id={`ev-${e.id}`}
                className={cn(
                  "rounded-2xl border bg-card p-4",
                  focus === e.id ? "border-gold" : "border-border",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-lg">{e.title}</h2>
                    <p className="text-sm text-muted-foreground">
                      {e.place} · {new Date(e.at).toLocaleString(localeTag(locale))}
                    </p>
                  </div>
                  <Badge tone={e.inviteOnly ? "gold" : "wool"}>
                    {e.inviteOnly ? t("events.inviteOnly") : t("events.open")}
                  </Badge>
                </div>
                {e.note && <p className="mt-2 text-sm text-pretty">{e.note}</p>}
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("events.host")}: {hidden ? "—" : e.host}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant={going ? "secondary" : "outline"}
                    onClick={() => (going ? unrsvp(e.id) : rsvp(e.id))}
                  >
                    {going ? t("events.leave") : t("events.rsvp")}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      void copyText(`si://e/${e.id}`);
                    }}
                  >
                    {t("events.invite")}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      const on = !reminders.includes(e.id);
                      if (on && typeof Notification !== "undefined" && Notification.permission === "default") {
                        void Notification.requestPermission();
                      }
                      setRemind(e.id, on);
                      void playSound("ui_tap");
                    }}
                  >
                    {reminders.includes(e.id) ? t("events.remindOn") : t("events.remind")}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => downloadIcs(e)}>
                    {t("events.calendar")}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => removeEvent(e.id)}>
                    {t("common.remove")}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("events.create")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label>{t("archive.titleField")}</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            <Label>{t("events.place")}</Label>
            <Input value={place} onChange={(e) => setPlace(e.target.value)} />
            <Label>{t("events.when")}</Label>
            <Input type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} />
            <Label>{t("events.noteField")}</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} />
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input type="checkbox" checked={inviteOnly} onChange={(e) => setInviteOnly(e.target.checked)} />
              {t("events.inviteOnly")}
            </label>
            <Button className="w-full" onClick={save}>
              {t("common.add")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
