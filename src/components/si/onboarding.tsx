import { useMemo, useState } from "react";
import { LOCALES } from "@/lib/si/i18n";
import { useSi } from "@/lib/si/store";
import { useT } from "@/lib/si/use-t";
import { playSound } from "@/lib/si/sounds";
import { mnemonicIsValid } from "@/lib/si/crypto";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SiWordmark } from "./mark";
import { cn } from "@/lib/utils";

type Step = "lang" | "what" | "wallet" | "password" | "seed" | "verify" | "import" | "profile";

export function Onboarding() {
  const t = useT();
  const locale = useSi((s) => s.locale);
  const setLocale = useSi((s) => s.setLocale);
  const createWallet = useSi((s) => s.createWallet);
  const importWallet = useSi((s) => s.importWallet);

  const [step, setStep] = useState<Step>("lang");
  const [mode, setMode] = useState<"create" | "import">("create");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [shownMnemonic, setShownMnemonic] = useState<string[] | null>(null);
  const [name, setName] = useState("");
  const [taip, setTaip] = useState("");
  const [country, setCountry] = useState("");
  const [importPhrase, setImportPhrase] = useState("");
  const [checks, setChecks] = useState<[number, string][]>([]);
  const [picks, setPicks] = useState<string[]>(["", "", ""]);

  const words = shownMnemonic ?? [];

  const options = useMemo(() => {
    if (!shownMnemonic || checks.length === 0) return [];
    return checks.map(([idx]) => {
      const correct = shownMnemonic[idx];
      const pool = shownMnemonic.filter((w) => w !== correct);
      const distractors: string[] = [];
      while (distractors.length < 3 && pool.length) {
        const j = Math.floor(Math.random() * pool.length);
        distractors.push(pool.splice(j, 1)[0]);
      }
      return shuffle([correct, ...distractors]);
    });
  }, [shownMnemonic, checks]);

  function go(next: Step) {
    void playSound("ui_tap");
    setError("");
    setStep(next);
  }

  async function sealCreate() {
    if (password.length < 8) {
      setError(t("on.short"));
      return;
    }
    if (password !== password2) {
      setError(t("on.mismatch"));
      return;
    }
    setBusy(true);
    setError("");
    try {
      const plain = await createWallet(password, {
        name: name || "—",
        taip: taip || undefined,
        country: country || undefined,
        hiddenProfile: false,
      });
      const w = plain.mnemonic.split(" ");
      setShownMnemonic(w);
      const idxs = pickThree(w.length);
      setChecks(idxs.map((i) => [i, w[i]]));
      setPicks(["", "", ""]);
      go("seed");
    } catch {
      setError(t("unlock.bad"));
    } finally {
      setBusy(false);
    }
  }

  async function sealImport() {
    if (!mnemonicIsValid(importPhrase)) {
      setError(t("on.badMnemonic"));
      void playSound("ui_warn");
      return;
    }
    if (password.length < 8) {
      setError(t("on.short"));
      return;
    }
    if (password !== password2) {
      setError(t("on.mismatch"));
      return;
    }
    setBusy(true);
    try {
      await importWallet(importPhrase, password, {
        name: name || "—",
        taip: taip || undefined,
        country: country || undefined,
        hiddenProfile: false,
      });
      void playSound("ui_success");
    } catch {
      setError(t("on.badMnemonic"));
    } finally {
      setBusy(false);
    }
  }

  function confirmWords() {
    const ok = checks.every(([i, w], n) => picks[n] === w || picks[n] === words[i]);
    if (!ok) {
      setError(t("on.wrong"));
      void playSound("ui_warn");
      return;
    }
    void playSound("ui_success");
    go("profile");
  }

  async function finishProfile() {
    if (!name.trim()) return;
    if (mode === "import") {
      await sealImport();
      useSi.getState().updateProfile({
        name: name.trim(),
        taip: taip || undefined,
        country: country || undefined,
      });
      useSi.getState().completeOnboarding();
      void playSound("ui_success");
      return;
    }
    useSi.getState().updateProfile({
      name: name.trim(),
      taip: taip || undefined,
      country: country || undefined,
    });
    useSi.getState().completeOnboarding();
    void playSound("ui_success");
  }

  return (
    <div className="relative flex min-h-dvh justify-center bg-background text-foreground">
      <div className="si-grain absolute inset-0" />
      <div className="si-ridge pointer-events-none absolute inset-x-0 bottom-0 h-40" />
      <div className="relative flex min-h-dvh w-full max-w-md flex-col px-5 pb-10 pt-[max(2rem,env(safe-area-inset-top))] md:max-w-lg">
        <header className="mb-6">
          <SiWordmark size="lg" />
          <div className="mt-2 text-xs text-wool">{t("app.tagline")}</div>
        </header>

        {step === "lang" && (
          <section className="flex flex-1 flex-col">
            <h1 className="mb-2 text-3xl">{t("on.langTitle")}</h1>
            <p className="mb-6 font-serif text-base leading-relaxed text-muted-foreground">{t("on.langHint")}</p>
            <div className="grid grid-cols-2 gap-2">
              {LOCALES.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => {
                    setLocale(l.id);
                    void playSound("ui_tap");
                  }}
                  className={cn(
                    "si-door flex min-h-16 flex-col items-start justify-center px-3 py-3",
                    locale === l.id ? "border-gold" : "",
                  )}
                >
                  <span className="font-display text-lg leading-tight">{l.native}</span>
                  <span className="text-xs text-muted-foreground">{l.latin}</span>
                </button>
              ))}
            </div>
            <Button className="mt-auto md:mt-10" onClick={() => go("what")}>
              {t("on.continue")}
            </Button>
          </section>
        )}

        {step === "what" && (
          <section className="flex flex-1 flex-col">
            <h1 className="mb-4 text-3xl">{t("on.whatTitle")}</h1>
            <p className="font-serif text-lg leading-relaxed text-pretty">{t("app.philosophy")}</p>
            <p className="mt-6 text-sm text-muted-foreground">{t("ethics.p1")}</p>
            <div className="mt-auto flex gap-3 md:mt-10">
              <Button variant="secondary" onClick={() => go("lang")}>
                {t("on.back")}
              </Button>
              <Button className="flex-1" onClick={() => go("wallet")}>
                {t("on.continue")}
              </Button>
            </div>
          </section>
        )}

        {step === "wallet" && (
          <section className="flex flex-1 flex-col">
            <h1 className="mb-2 text-3xl">{t("on.walletTitle")}</h1>
            <p className="mb-6 text-sm text-muted-foreground">{t("on.walletBody")}</p>
            <div className="grid gap-3">
              <Button
                size="lg"
                onClick={() => {
                  setMode("create");
                  go("password");
                }}
              >
                {t("on.create")}
              </Button>
              <Button
                size="lg"
                variant="secondary"
                onClick={() => {
                  setMode("import");
                  go("import");
                }}
              >
                {t("on.import")}
              </Button>
            </div>
            <button type="button" className="mt-auto text-sm text-muted-foreground" onClick={() => go("what")}>
              {t("on.back")}
            </button>
          </section>
        )}

        {step === "import" && (
          <section className="flex flex-1 flex-col gap-4">
            <h1 className="text-3xl">{t("on.importTitle")}</h1>
            <p className="text-sm text-muted-foreground">{t("on.importHint")}</p>
            <textarea
              className="min-h-32 rounded-xl border border-border bg-card p-3 font-mono text-sm"
              value={importPhrase}
              onChange={(e) => setImportPhrase(e.target.value)}
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              autoComplete="off"
            />
            {error && <p className="text-sm text-garnet">{error}</p>}
            <div className="mt-auto flex gap-3 md:mt-10">
              <Button variant="secondary" onClick={() => go("wallet")}>
                {t("on.back")}
              </Button>
              <Button className="flex-1" onClick={() => go("password")}>
                {t("on.continue")}
              </Button>
            </div>
          </section>
        )}

        {step === "password" && (
          <section className="flex flex-1 flex-col gap-4">
            <h1 className="text-3xl">{t("on.passwordTitle")}</h1>
            <p className="text-sm text-muted-foreground">{t("on.passwordHint")}</p>
            <Label htmlFor="pw">{t("on.password")}</Label>
            <Input
              id="pw"
              type="password"
              autoComplete="new-password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Label htmlFor="pw2">{t("on.password2")}</Label>
            <Input
              id="pw2"
              type="password"
              autoComplete="new-password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
            />
            {error && <p className="text-sm text-garnet">{error}</p>}
            <div className="mt-auto flex gap-3 md:mt-10">
              <Button variant="secondary" onClick={() => go(mode === "import" ? "import" : "wallet")}>
                {t("on.back")}
              </Button>
              <Button
                className="flex-1"
                disabled={busy}
                onClick={() => {
                  if (mode === "import") go("profile");
                  else void sealCreate();
                }}
              >
                {busy ? t("on.sealing") : t("on.continue")}
              </Button>
            </div>
          </section>
        )}

        {step === "seed" && shownMnemonic && (
          <section className="flex flex-1 flex-col">
            <h1 className="mb-2 text-3xl">{t("on.seedTitle")}</h1>
            <p className="mb-4 text-sm text-wool">{t("on.seedWarn")}</p>
            <ol className="seed-secure grid grid-cols-2 gap-2">
              {shownMnemonic.map((w, i) => (
                <li
                  key={i}
                  className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm"
                >
                  <span className="tabular w-5 text-xs text-gold">{i + 1}</span>
                  {w}
                </li>
              ))}
            </ol>
            <Button className="mt-auto" onClick={() => go("verify")}>
              {t("on.wrote")}
            </Button>
          </section>
        )}

        {step === "verify" && (
          <section className="flex flex-1 flex-col gap-5">
            <h1 className="text-3xl">{t("on.verifyTitle")}</h1>
            {checks.map(([idx], n) => (
              <div key={idx}>
                <p className="mb-2 text-sm text-muted-foreground">
                  {t("on.wordN")} {idx + 1}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {(options[n] ?? []).map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => {
                        const next = [...picks] as [string, string, string];
                        next[n] = w;
                        setPicks(next);
                        void playSound("ui_tap");
                      }}
                      className={cn(
                        "h-11 rounded-xl border text-sm",
                        picks[n] === w ? "border-gold bg-card" : "border-border bg-card/50",
                      )}
                    >
                      {w}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {error && <p className="text-sm text-garnet">{error}</p>}
            <Button className="mt-auto" onClick={confirmWords}>
              {t("on.continue")}
            </Button>
          </section>
        )}

        {step === "profile" && (
          <section className="flex flex-1 flex-col gap-4">
            <h1 className="text-3xl">{t("on.nameTitle")}</h1>
            <Label htmlFor="name">{t("on.name")}</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
            <Label htmlFor="taip">{t("on.taip")}</Label>
            <Input id="taip" value={taip} onChange={(e) => setTaip(e.target.value)} />
            <Label htmlFor="country">{t("on.country")}</Label>
            <Input id="country" value={country} onChange={(e) => setCountry(e.target.value)} />
            <Button className="mt-auto" disabled={!name.trim()} onClick={() => void finishProfile()}>
              {t("on.enter")}
            </Button>
          </section>
        )}
      </div>
    </div>
  );
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickThree(n: number): number[] {
  const idx = [...Array(n).keys()];
  const out: number[] = [];
  while (out.length < 3 && idx.length) {
    const j = Math.floor(Math.random() * idx.length);
    out.push(idx.splice(j, 1)[0]);
  }
  return out.sort((a, b) => a - b);
}
