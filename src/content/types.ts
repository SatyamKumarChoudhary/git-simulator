import type { RepoState } from "@/engine";

export interface GoalContext {
  state: RepoState;
  /** The level's starting state — useful for "has this changed?" checks. */
  initial: RepoState;
  /** Successful commands the player has run so far, oldest first. */
  commands: readonly string[];
}

export interface Goal {
  id: string;
  label: string;
  check: (ctx: GoalContext) => boolean;
  /** Once achieved, a sticky goal stays achieved (for "visit X, then come back" missions). */
  sticky?: boolean;
}

/**
 * Where a level sits in the learning path: "learn" introduces one new idea, "practice" uses that same idea in a
 * fresh situation, and "checkpoint" mixes several earlier ideas so you have to recall them without being told.
 */
export type LevelPhase = "learn" | "practice" | "checkpoint";

export interface LevelDefinition {
  id: string;
  title: string;
  /** Defaults to "learn". */
  phase?: LevelPhase;
  /** One-paragraph problem statement. */
  mission: string;
  concept: { title: string; body: string };
  /** Commands that build the starting repository. */
  setup: string[];
  goals: Goal[];
  /** Graded hints: a nudge first, the answer last. */
  hints: string[];
  /** Reference solution. `{{rev:HEAD~2}}` is replaced with that commit's short id in the starting repository. */
  solution: string[];
  xp: number;
}

/** Colour family a topic uses on the map and in its banner. */
export type TopicTheme = "emerald" | "sky" | "violet" | "pink" | "amber" | "cyan" | "fuchsia" | "indigo";

/** A topic: one subject, its own map, its own list of questions in the order players meet them. */
export interface TopicDefinition {
  id: string;
  title: string;
  emoji: string;
  tagline: string;
  theme: TopicTheme;
  levels: LevelDefinition[];
}

/** What you hand to defineTopic: the same thing, plus optional inserts that place questions at a position. */
export interface TopicInput extends Omit<TopicDefinition, "levels"> {
  levels: LevelDefinition[];
  /** Questions added at a position without editing `levels`, e.g. `{ item: level, place: { after: "git-init" } }`. */
  inserts?: ReadonlyArray<{ item: LevelDefinition; place: { at: "start" | "end" | number } | { after: string } | { before: string } }>;
}

/** Older names, kept so existing imports keep working. */
export type WorldTheme = TopicTheme;
export type WorldDefinition = TopicDefinition;

export interface SandboxPreset {
  id: string;
  title: string;
  emoji: string;
  description: string;
  setup: string[];
}
