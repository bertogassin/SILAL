import { playSound } from "./sounds";

const CLEAR_MS = 20_000;
let clearTimer = 0;

/** Copy. Secrets are wiped from the clipboard after 20s. */
export async function copyText(text: string, opts?: { secret?: boolean }): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    void playSound("ui_tap");
  } catch {
    return;
  }
  window.clearTimeout(clearTimer);
  if (opts?.secret) {
    clearTimer = window.setTimeout(() => {
      void navigator.clipboard.writeText("").catch(() => {});
    }, CLEAR_MS);
  }
}
