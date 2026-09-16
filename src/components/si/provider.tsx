import { useEffect, type ReactNode } from "react";
import { localeTag } from "@/lib/si/i18n";
import { useSi } from "@/lib/si/store";
import { setSoundsEnabled } from "@/lib/si/sounds";

export function SiProvider({ children }: { children: ReactNode }) {
  const theme = useSi((s) => s.theme);
  const locale = useSi((s) => s.locale);
  const sounds = useSi((s) => s.sounds);
  const idleMinutes = useSi((s) => s.idleMinutes);
  const reminders = useSi((s) => s.reminders);
  const events = useSi((s) => s.events);

  useEffect(() => {
    const apply = () => {
      const st = useSi.getState();
      document.documentElement.dataset.theme = st.theme;
      document.documentElement.lang = localeTag(st.locale);
      setSoundsEnabled(st.sounds);
      useSi.setState({ hydrated: true });
      const hash = window.location.hash.replace(/^#/, "");
      if (hash.startsWith("si://")) {
        st.applyInvite(hash);
        history.replaceState(null, "", window.location.pathname + window.location.search);
      }
    };
    try {
      void Promise.resolve(useSi.persist.rehydrate()).finally(apply);
    } catch {
      apply();
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.lang = localeTag(locale);
    setSoundsEnabled(sounds);
  }, [theme, locale, sounds]);

  useEffect(() => {
    let timer = 0;
    const ms = idleMinutes * 60 * 1000;
    const bump = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const s = useSi.getState();
        if (s.session.unlocked) s.lock();
      }, ms);
    };
    bump();
    window.addEventListener("pointerdown", bump);
    window.addEventListener("keydown", bump);
    window.addEventListener("touchstart", bump, { passive: true });
    const lockNow = () => {
      const s = useSi.getState();
      if (s.session.unlocked) s.lock();
    };
    const onVis = () => {
      if (document.hidden) lockNow();
      else bump();
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pagehide", lockNow);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointerdown", bump);
      window.removeEventListener("keydown", bump);
      window.removeEventListener("touchstart", bump);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pagehide", lockNow);
    };
  }, [idleMinutes]);

  useEffect(() => {
    if (typeof Notification === "undefined") return;
    const timers: number[] = [];
    for (const id of reminders) {
      const ev = events.find((e) => e.id === id);
      if (!ev) continue;
      const wait = new Date(ev.at).getTime() - Date.now() - 30 * 60 * 1000;
      if (wait <= 0 || wait > 8 * 86400000) continue;
      timers.push(
        window.setTimeout(() => {
          if (Notification.permission === "granted") {
            new Notification(ev.title, { body: ev.place, tag: `si-ev-${ev.id}` });
          }
        }, wait),
      );
    }
    return () => {
      for (const id of timers) window.clearTimeout(id);
    };
  }, [reminders, events]);

  return <>{children}</>;
}