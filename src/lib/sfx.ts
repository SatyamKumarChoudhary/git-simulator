"use client";

/**
 * Tiny synthesized sound effects (Web Audio) — no audio files needed.
 * Browsers only allow audio after a user gesture; commands are typed, so that's always true in play.
 */

export type SoundName = "fanfare";

let audio: AudioContext | null = null;
let master: GainNode | null = null;

function context(): { ac: AudioContext; out: GainNode } | null {
  if (typeof window === "undefined") return null;
  try {
    if (!audio) {
      audio = new AudioContext();
      master = audio.createGain();
      master.gain.value = 0.55;
      master.connect(audio.destination);
    }
    if (audio.state === "suspended") void audio.resume();
    return { ac: audio, out: master! };
  } catch {
    return null;
  }
}

interface ToneOptions {
  freq: number;
  to?: number;
  start?: number;
  dur: number;
  type?: OscillatorType;
  gain?: number;
}

function tone({ ac, out }: { ac: AudioContext; out: GainNode }, { freq, to, start = 0, dur, type = "sine", gain = 0.12 }: ToneOptions) {
  const t0 = ac.currentTime + start;
  const osc = ac.createOscillator();
  const env = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(env).connect(out);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

export function playSound(name: SoundName): void {
  const c = context();
  if (!c) return;
  switch (name) {
    case "fanfare":
      [523, 659, 784, 1047].forEach((freq, i) => tone(c, { freq, start: i * 0.11, dur: i === 3 ? 0.6 : 0.2, type: "triangle", gain: 0.11 }));
      tone(c, { freq: 1319, start: 0.44, dur: 0.6, gain: 0.05 });
      break;
  }
}
