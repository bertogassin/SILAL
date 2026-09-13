import { LOCALES } from "@/lib/si/i18n";
import { useSi } from "@/lib/si/store";
import { useT } from "@/lib/si/use-t";
import { pairingUri, vaultFingerprint } from "@/lib/si/pairing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { QrCode } from "./qr";
import { PageHead } from "./page-head";

export function SettingsScreen() {
  const t = useT();
  const locale = useSi((s) => s.locale);
  const theme = useSi((s) => s.theme);
  const sounds = useSi((s) => s.sounds);
  const profile = useSi((s) => s.profile);
  const blocked = useSi((s) => s.blocked);
  const setLocale = useSi((s) => s.setLocale);
  const setTheme = useSi((s) => s.setTheme);
  const setSounds = useSi((s) => s.setSounds);
  const updateProfile = useSi((s) => s.updateProfile);
  const cryptoProvider = useSi((s) => s.cryptoProvider);
  const setCryptoProvider = useSi((s) => s.setCryptoProvider);
  const blockContact = useSi((s) => s.blockContact);
  const unblockContact = useSi((s) => s.unblockContact);
  const exportAll = useSi((s) => s.exportAll);
  const wipe = useSi((s) => s.wipe);
  const lock = useSi((s) => s.lock);
  const panic = useSi((s) => s.panic);
  const vault = useSi((s) => s.vault);
  const restorePublic = useSi((s) => s.restorePublic);
  const restoreVault = useSi((s) => s.restoreVault);
  const markBackup = useSi((s) => s.markBackup);
  const idleMinutes = useSi((s) => s.idleMinutes);
  const setIdleMinutes = useSi((s) => s.setIdleMinutes);
  const changePassword = useSi((s) => s.changePassword);
  const [block, setBlock] = useState("");
  const [family, setFamily] = useState(profile?.familyContact ?? "");
  const [profileName, setProfileName] = useState(profile?.name ?? "");
  const [taip, setTaip] = useState(profile?.taip ?? "");
  const [country, setCountry] = useState(profile?.country ?? "");
  const [vaultPass, setVaultPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [syncMsg, setSyncMsg] = useState("");
  const fp = vault ? vaultFingerprint(vault) : "";

  function download() {
    const blob = new Blob([exportAll()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "si-export.json";
    a.click();
    URL.revokeObjectURL(url);
    markBackup();
  }

  function downloadVault() {
    if (!vault) return;
    const blob = new Blob([JSON.stringify(vault)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "si-vault.json";
    a.click();
    URL.revokeObjectURL(url);
    markBackup();
  }

  function readFile(file: File | undefined, then: (text: string) => void) {
    if (!file) return;
    void file.text().then(then);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageHead kicker={t("settings.title")} title={t("nav.settings")} />

      <section className="space-y-3">
        <h2 className="text-sm uppercase tracking-[0.16em] text-wool">{t("settings.language")}</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {LOCALES.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => setLocale(l.id)}
              className={cn(
                "flex min-h-14 flex-col items-start justify-center rounded-xl border px-3 py-2 text-left",
                locale === l.id ? "border-gold bg-card" : "border-border",
              )}
            >
              <span className="text-sm font-medium leading-tight">{l.native}</span>
              <span className="text-xs text-muted-foreground">{l.latin}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm uppercase tracking-[0.16em] text-wool">{t("settings.theme")}</h2>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setTheme("dark")}
            className={cn("h-12 rounded-xl border", theme === "dark" ? "border-gold" : "border-border")}
          >
            {t("settings.dark")}
          </button>
          <button
            type="button"
            onClick={() => setTheme("light")}
            className={cn("h-12 rounded-xl border", theme === "light" ? "border-gold" : "border-border")}
          >
            {t("settings.light")}
          </button>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm uppercase tracking-[0.16em] text-wool">{t("hybrid.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("hybrid.hint")}</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setCryptoProvider("classic")}
            className={cn("h-12 rounded-xl border", cryptoProvider === "classic" ? "border-gold" : "border-border")}
          >
            {t("hybrid.classic")}
          </button>
          <button
            type="button"
            onClick={() => setCryptoProvider("hybrid")}
            className={cn("h-12 rounded-xl border", cryptoProvider === "hybrid" ? "border-gold" : "border-border")}
          >
            {t("hybrid.hybrid")}
          </button>
        </div>
      </section>

      <section className="flex items-center justify-between rounded-2xl border border-border px-4 py-3">
        <Label htmlFor="sounds">{t("settings.sounds")}</Label>
        <Switch id="sounds" checked={sounds} onCheckedChange={setSounds} />
      </section>

      <section className="space-y-3 rounded-2xl border border-border p-4">
        <h2 className="font-display text-lg">{t("settings.idle")}</h2>
        <p className="text-sm text-muted-foreground">{t("settings.idleHint")}</p>
        <div className="grid grid-cols-3 gap-2">
          {([5, 12, 30] as const).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setIdleMinutes(n)}
              className={cn("h-11 rounded-xl border text-sm", idleMinutes === n ? "border-gold" : "border-border")}
            >
              {n} {t("settings.minutes")}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border border-border p-4">
        <h2 className="font-display text-lg">{t("settings.profile")}</h2>
        <Label>{t("on.name")}</Label>
        <Input value={profileName} onChange={(e) => setProfileName(e.target.value)} />
        <Label>{t("on.taip")}</Label>
        <Input value={taip} onChange={(e) => setTaip(e.target.value)} />
        <Label>{t("on.country")}</Label>
        <Input value={country} onChange={(e) => setCountry(e.target.value)} />
        <Button
          variant="secondary"
          onClick={() =>
            updateProfile({
              name: profileName.trim() || profile?.name || "—",
              taip: taip || undefined,
              country: country || undefined,
            })
          }
        >
          {t("common.save")}
        </Button>
      </section>

      <section className="space-y-3 rounded-2xl border border-border p-4">
        <h2 className="font-display text-lg">{t("settings.hidden")}</h2>
        <p className="text-sm text-muted-foreground">{t("settings.hiddenHint")}</p>
        <Switch
          checked={!!profile?.hiddenProfile}
          onCheckedChange={(v) => updateProfile({ hiddenProfile: v })}
        />
        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            if (confirm(t("panic.confirm"))) panic();
          }}
        >
          {t("panic.btn")}
        </Button>
        <Label>{t("settings.familyContact")}</Label>
        <div className="flex gap-2">
          <Input value={family} onChange={(e) => setFamily(e.target.value)} />
          <Button variant="secondary" onClick={() => updateProfile({ familyContact: family })}>
            {t("common.save")}
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm uppercase tracking-[0.16em] text-wool">{t("settings.blockedPeople")}</h2>
        <p className="text-sm text-muted-foreground">{t("settings.blockHint")}</p>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            blockContact(block);
            setBlock("");
          }}
        >
          <Input value={block} onChange={(e) => setBlock(e.target.value)} placeholder={t("settings.addBlock")} />
          <Button type="submit" variant="secondary">
            {t("settings.block")}
          </Button>
        </form>
        <ul className="space-y-1">
          {blocked.map((b) => (
            <li key={b} className="flex items-center justify-between text-sm">
              {b}
              <button type="button" className="text-wool" onClick={() => unblockContact(b)}>
                {t("common.remove")}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2 rounded-2xl border border-border p-4">
        <h2 className="font-display text-lg">{t("settings.ethics")}</h2>
        <p className="text-sm text-pretty">{t("ethics.p1")}</p>
        <p className="text-sm text-pretty">{t("ethics.p2")}</p>
      </section>

      <section className="space-y-2 rounded-2xl border border-gold/30 bg-card p-4">
        <h2 className="font-display text-lg">{t("custom.title")}</h2>
        <p className="text-sm text-pretty">{t("custom.adat")}</p>
        <p className="text-sm text-pretty">{t("custom.kinship")}</p>
        <p className="text-sm text-pretty">{t("custom.consent")}</p>
      </section>

      <section className="space-y-3 rounded-2xl border border-border p-4">
        <h2 className="font-display text-lg">{t("sync.vault")}</h2>
        <p className="text-sm text-muted-foreground">{t("sync.vaultHint")}</p>
        {fp && (
          <>
            <QrCode value={pairingUri(fp)} label={fp} />
            <p className="break-all text-center font-mono text-xs text-muted-foreground">{pairingUri(fp)}</p>
          </>
        )}
        <Button variant="secondary" className="w-full" onClick={downloadVault} disabled={!vault}>
          {t("sync.download")}
        </Button>
        <Label>{t("on.password")}</Label>
        <Input type="password" value={vaultPass} onChange={(e) => setVaultPass(e.target.value)} />
        <Label>{t("settings.newPassword")}</Label>
        <Input type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} />
        <Button
          variant="outline"
          className="w-full"
          disabled={!vaultPass || newPass.length < 8}
          onClick={() => {
            void changePassword(vaultPass, newPass).then((r) => {
              setSyncMsg(r.ok ? t("settings.pwOk") : t("settings.pwBad"));
              if (r.ok) setNewPass("");
            });
          }}
        >
          {t("settings.changePw")}
        </Button>
        <label className="block w-full cursor-pointer rounded-xl border border-dashed border-border px-4 py-3 text-sm">
          {t("sync.restoreVault")}
          <input
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              readFile(f, (text) => {
                void restoreVault(text, vaultPass).then((r) => {
                  setSyncMsg(r.ok ? t("sync.ok") : t("sync.bad"));
                });
                e.target.value = "";
              });
            }}
          />
        </label>
        <label className="block w-full cursor-pointer rounded-xl border border-dashed border-border px-4 py-3 text-sm">
          {t("sync.restoreTree")}
          <input
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              readFile(f, (text) => {
                setSyncMsg(restorePublic(text).ok ? t("sync.ok") : t("sync.bad"));
                e.target.value = "";
              });
            }}
          />
        </label>
        {syncMsg && <p className="text-sm text-wool">{syncMsg}</p>}
      </section>

      <div className="grid gap-2">
        <Button variant="secondary" onClick={download}>
          {t("settings.export")}
        </Button>
        <Button variant="secondary" onClick={() => lock()}>
          {t("wallet.lock")}
        </Button>
        <Button
          variant="garnet"
          onClick={() => {
            if (confirm(t("settings.deleteHint"))) wipe();
          }}
        >
          {t("settings.delete")}
        </Button>
      </div>
    </div>
  );
}
