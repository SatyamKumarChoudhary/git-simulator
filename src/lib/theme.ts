import type { WorldTheme } from "@/content";

/** Tailwind class bundles per world theme (spelled out in full so Tailwind can see them). */
export const worldTheme: Record<WorldTheme, { text: string; bg: string; border: string; glow: string; solid: string; hex: string }> = {
  emerald: {
    text: "text-emerald-700 dark:text-emerald-300",
    bg: "bg-emerald-400/15 dark:bg-emerald-400/10",
    border: "border-emerald-500/35 dark:border-emerald-400/30",
    glow: "shadow-[0_0_40px_-10px_rgb(52_211_153_/_0.6)]",
    solid: "bg-emerald-400",
    hex: "#34d399",
  },
  violet: {
    text: "text-violet-600 dark:text-violet-300",
    bg: "bg-violet-400/15 dark:bg-violet-400/10",
    border: "border-violet-500/35 dark:border-violet-400/30",
    glow: "shadow-[0_0_40px_-10px_rgb(167_139_250_/_0.6)]",
    solid: "bg-violet-400",
    hex: "#a78bfa",
  },
  pink: {
    text: "text-pink-600 dark:text-pink-300",
    bg: "bg-pink-400/15 dark:bg-pink-400/10",
    border: "border-pink-500/35 dark:border-pink-400/30",
    glow: "shadow-[0_0_40px_-10px_rgb(244_114_182_/_0.6)]",
    solid: "bg-pink-400",
    hex: "#f472b6",
  },
  amber: {
    text: "text-amber-700 dark:text-amber-300",
    bg: "bg-amber-400/15 dark:bg-amber-400/10",
    border: "border-amber-500/35 dark:border-amber-400/30",
    glow: "shadow-[0_0_40px_-10px_rgb(251_191_36_/_0.6)]",
    solid: "bg-amber-400",
    hex: "#fbbf24",
  },
  cyan: {
    text: "text-cyan-700 dark:text-cyan-300",
    bg: "bg-cyan-400/15 dark:bg-cyan-400/10",
    border: "border-cyan-500/35 dark:border-cyan-400/30",
    glow: "shadow-[0_0_40px_-10px_rgb(34_211_238_/_0.6)]",
    solid: "bg-cyan-400",
    hex: "#22d3ee",
  },
  sky: {
    text: "text-sky-700 dark:text-sky-300",
    bg: "bg-sky-400/15 dark:bg-sky-400/10",
    border: "border-sky-500/35 dark:border-sky-400/30",
    glow: "shadow-[0_0_40px_-10px_rgb(56_189_248_/_0.6)]",
    solid: "bg-sky-400",
    hex: "#38bdf8",
  },
  fuchsia: {
    text: "text-fuchsia-600 dark:text-fuchsia-300",
    bg: "bg-fuchsia-400/15 dark:bg-fuchsia-400/10",
    border: "border-fuchsia-500/35 dark:border-fuchsia-400/30",
    glow: "shadow-[0_0_40px_-10px_rgb(232_121_249_/_0.6)]",
    solid: "bg-fuchsia-400",
    hex: "#e879f9",
  },
  indigo: {
    text: "text-indigo-600 dark:text-indigo-300",
    bg: "bg-indigo-400/15 dark:bg-indigo-400/10",
    border: "border-indigo-500/35 dark:border-indigo-400/30",
    glow: "shadow-[0_0_40px_-10px_rgb(129_140_248_/_0.6)]",
    solid: "bg-indigo-400",
    hex: "#818cf8",
  },
};

export const MAIN_BRANCH_COLOR = "#38bdf8";
export const HEAD_COLOR = "#fb923c";
export const ORPHAN_COLOR = "#64748b";

const BRANCH_PALETTE = ["#a78bfa", "#f472b6", "#34d399", "#fbbf24", "#fb7185", "#a3e635", "#2dd4bf", "#c084fc"];

/** Stable colour per branch name; main/master are always sky blue. */
export function branchColor(name: string): string {
  if (name === "main" || name === "master") return MAIN_BRANCH_COLOR;
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return BRANCH_PALETTE[hash % BRANCH_PALETTE.length];
}
