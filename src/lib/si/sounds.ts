/**
 * Original si tones, generated in-graph. No third-party samples.
 * ui_tap 40–60ms wooden hit; success two rising notes; warn low string;
 * tx_sent short mountain motif ~0.6s; invite_accepted same with overtone.
 */
export type SiSound = "ui_tap" | "ui_success" | "ui_warn" | "tx_sent" | "invite_accepted";

let ctx: AudioContext | null = null;
let enabled = true;

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
    // Still allow a quieter tap; skip long motifs.
  }
  if (!ctx) {
    const C = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  return ctx;
}

export function setSoundsEnabled(v: boolean): void {
  enabled = v;
}

export function soundsEnabled(): boolean {
  return enabled;
}

function envGain(ctx: AudioContext, t0: number, a: number, d: number, peak: number): GainNode {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
  return g;
}

function tone(
  ctx: AudioContext,
  dest: AudioNode,
  freq: number,
  t0: number,
  dur: number,
  type: OscillatorType,
  peak: number,
): void {
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  const g = envGain(ctx, t0, 0.012, dur, peak);
  osc.connect(g);
  g.connect(dest);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function woodenHit(ctx: AudioContext, dest: AudioNode, t0: number): void {
  const osc = ctx.createOscillator();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(220, t0);
  osc.frequency.exponentialRampToValueAtTime(90, t0 + 0.05);
  const g = envGain(ctx, t0, 0.004, 0.05, 0.06);
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 1200;
  osc.connect(g);
  g.connect(filter);
  filter.connect(dest);
  osc.start(t0);
  osc.stop(t0 + 0.06);

  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.04), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 3);
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const ng = envGain(ctx, t0, 0.002, 0.03, 0.03);
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 800;
  noise.connect(ng);
  ng.connect(bp);
  bp.connect(dest);
  noise.start(t0);
}

export async function playSound(name: SiSound): Promise<void> {
  if (!enabled) return;
  const audio = ac();
  if (!audio) return;
  if (audio.state === "suspended") {
    try {
      await audio.resume();
    } catch {
      return;
    }
  }
  const t0 = audio.currentTime + 0.01;
  const master = audio.createGain();
  master.gain.value = 0.85;
  master.connect(audio.destination);

  if (name === "ui_tap") {
    woodenHit(audio, master, t0);
    return;
  }
  if (name === "ui_success") {
    tone(audio, master, 392, t0, 0.12, "sine", 0.05);
    tone(audio, master, 523.25, t0 + 0.11, 0.16, "sine", 0.05);
    return;
  }
  if (name === "ui_warn") {
    tone(audio, master, 164.8, t0, 0.28, "triangle", 0.05);
    tone(audio, master, 146.8, t0 + 0.08, 0.32, "sine", 0.03);
    return;
  }
  // Short mountain motif in a minor pentatonic: D4 F4 G4 A4
  const motif = [
    { f: 293.66, at: 0, d: 0.12 },
    { f: 349.23, at: 0.12, d: 0.12 },
    { f: 392.0, at: 0.24, d: 0.14 },
    { f: 440.0, at: 0.4, d: 0.2 },
  ];
  for (const n of motif) {
    tone(audio, master, n.f, t0 + n.at, n.d, "sine", 0.045);
    if (name === "invite_accepted") {
      tone(audio, master, n.f * 2, t0 + n.at, n.d, "triangle", 0.012);
    }
  }
}
