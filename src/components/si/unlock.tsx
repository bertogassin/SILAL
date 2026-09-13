import { useEffect, useRef, useState } from "react";
import { useSi } from "@/lib/si/store";
import { useT } from "@/lib/si/use-t";
import { playSound } from "@/lib/si/sounds";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SiMark } from "./mark";

const WAIT_AFTER = 5;
const WAIT_MS = 20_000;

export function UnlockScreen() {
  const t = useT();
  const unlock = useSi((s) => s.unlock);
  const wipe = useSi((s) => s.wipe);
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(false);
  const [fails, setFails] = useState(0);
  const [waitUntil, setWaitUntil] = useState(0);
  const [now, setNow] = useState(Date.now());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (waitUntil <= Date.now()) return;
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [waitUntil]);

  const waiting = waitUntil > now;
  const waitSec = Math.max(0, Math.ceil((waitUntil - now) / 1000));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (waiting || busy) return;
    setBusy(true);
    setErr(false);
    const ok = await unlock(pw);
    setBusy(false);
    if (!ok) {
      const next = fails + 1;
      setFails(next);
      setErr(true);
      setPw("");
      void playSound("ui_warn");
      if (next >= WAIT_AFTER) setWaitUntil(Date.now() + WAIT_MS * Math.min(3, next - WAIT_AFTER + 1));
      requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      setFails(0);
      void playSound("ui_success");
    }
  }

  return (
    <div className="relative flex min-h-dvh justify-center bg-background px-5 pt-[max(3rem,env(safe-area-inset-top))] text-foreground">
      <div className="si-grain pointer-events-none absolute inset-0 opacity-20" />
      <div className="si-ridge pointer-events-none absolute inset-x-0 bottom-0 h-36" />
      <form onSubmit={onSubmit} className="relative mx-auto flex w-full max-w-sm flex-1 flex-col">
        <SiMark className="mb-5 size-14" />
        <p className="si-kicker">{t("app.name")}</p>
        <h1 className="mt-2 font-display text-3xl">{t("unlock.title")}</h1>
        <p className="mt-3 mb-6 font-serif text-base leading-relaxed text-muted-foreground">{t("unlock.body")}</p>
        <Label htmlFor="unlock-pw">{t("on.password")}</Label>
        <Input
          ref={inputRef}
          id="unlock-pw"
          className="mt-2"
          type="password"
          autoComplete="current-password"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          disabled={waiting}
        />
        {err && <p className="mt-2 text-sm text-garnet">{t("unlock.bad")}</p>}
        {waiting && (
          <p className="mt-2 text-sm text-wool">
            {t("unlock.wait")} {waitSec}
          </p>
        )}
        <Button className="mt-6" type="submit" disabled={busy || waiting || !pw}>
          {busy ? t("on.sealing") : t("wallet.unlock")}
        </Button>
        <button
          type="button"
          className="mt-auto min-h-11 pb-8 text-center text-sm text-muted-foreground"
          onClick={() => {
            if (confirm(t("settings.deleteHint"))) wipe();
          }}
        >
          {t("settings.delete")}
        </button>
      </form>
    </div>
  );
}