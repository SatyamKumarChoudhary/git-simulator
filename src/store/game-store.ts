"use client";

import { createContext, useContext } from "react";
import { useStore } from "zustand";
import { createStore, type StoreApi } from "zustand/vanilla";
import { findLevel, levelPar, levelStartState, sandboxPresets } from "@/content";
import type { LevelDefinition } from "@/content";
import {
  type EngineEvent,
  type Frame,
  type OutputLine,
  type RepoState,
  type Tone,
  engine,
  statesEqual,
} from "@/engine";
import { useCustomCommands } from "./custom-commands-store";
import { useProgress } from "./progress-store";
import { resumableSession, signatureOf, writeSession } from "./session-cache";

export type Session = { kind: "level"; levelId: string } | { kind: "sandbox"; presetId: string };

export type TerminalEntry =
  | { id: number; kind: "input"; text: string; prompt: string }
  | { id: number; kind: "announce"; text: string }
  | { id: number; kind: "output"; line: OutputLine }
  | { id: number; kind: "system"; text: string; tone: Tone };

export interface Pulse {
  id: number;
  events: EngineEvent[];
}

export interface CompletionResult {
  stars: number;
  xpEarned: number;
  xpAvailable: number;
  moves: number;
  par: number;
  hintsUsed: number;
}

interface UndoSnapshot {
  repo: RepoState;
  commandCount: number;
  input: string;
}

export interface GameState {
  session: Session;
  level: LevelDefinition | null;
  repo: RepoState;
  initialRepo: RepoState;
  entries: TerminalEntry[];
  inputHistory: string[];
  draft: string;
  /** Bumped whenever something outside the terminal wants it focused. */
  focusRequest: number;
  commands: string[];
  undoStack: UndoSnapshot[];
  playing: boolean;
  pulse: Pulse;
  achieved: string[];
  moves: number;
  hintsShown: number;
  solutionShown: boolean;
  speed: number;
  result: CompletionResult | null;
  resultOpen: boolean;

  submit: (input: string) => void;
  setDraft: (text: string) => void;
  insertCommand: (text: string) => void;
  undo: () => void;
  restart: () => void;
  loadPreset: (presetId: string) => void;
  revealHint: () => void;
  revealSolution: () => void;
  setSpeed: (speed: number) => void;
  closeResult: () => void;
  dispose: () => void;
}

const BASE_FRAME_DELAY = 750;
const QUIET_FRAME_DELAY = 260;
const MAX_ENTRIES = 500;
/** How long after the last change the session is written to the browser. Long enough to coalesce a burst of frames. */
const SAVE_DELAY = 600;

let entryIds = 0;
const nextId = () => ++entryIds;

export function promptLabel(repo: RepoState): string {
  if (!repo.initialized) return "";
  if (repo.head.kind === "branch") return repo.head.name;
  return repo.head.commit.slice(0, 7);
}

function introEntries(): TerminalEntry[] {
  return [{ id: nextId(), kind: "system", text: "Tab completes · ↑ history · help lists commands", tone: "muted" }];
}

/** The result a resumed level was already awarded, rebuilt from what the cache kept. */
function earnedResult(level: LevelDefinition, saved: { moves: number; hintsShown: number; solutionShown: boolean }): CompletionResult {
  const par = levelPar(level);
  return {
    stars: scoreStars(saved.moves, par, saved.hintsShown, saved.solutionShown),
    xpEarned: 0,
    xpAvailable: level.xp,
    moves: saved.moves,
    par,
    hintsUsed: saved.hintsShown,
  };
}

/** The fields a cache restores. Everything else — playback, the draft, the result dialog — starts clean. */
function resumedState(session: Session, level: LevelDefinition | null, fresh: ReturnType<typeof freshState>) {
  const saved = resumableSession(session, level);
  if (!saved) return fresh;
  // Terminal entry ids have to stay ahead of the restored ones, or React would see two entries with the same key.
  entryIds = Math.max(entryIds, ...saved.entries.map((entry) => entry.id), 0);
  return {
    ...fresh,
    // A level finished before the reload has already been celebrated and already counted: rebuilding its result keeps
    // the next command from throwing the same party twice.
    result: level && saved.achieved.length === level.goals.length ? earnedResult(level, saved) : null,
    repo: saved.repo,
    initialRepo: saved.initialRepo,
    entries: saved.entries,
    commands: saved.commands,
    achieved: saved.achieved,
    moves: saved.moves,
    hintsShown: saved.hintsShown,
    solutionShown: saved.solutionShown,
  };
}

function freshState(session: Session) {
  const level = session.kind === "level" ? (findLevel(session.levelId)?.level ?? null) : null;
  const preset = session.kind === "sandbox" ? (sandboxPresets.find((p) => p.id === session.presetId) ?? sandboxPresets[0]) : null;
  const repo = level ? levelStartState(level) : engine.build(preset?.setup ?? []);
  return {
    session,
    level,
    repo,
    initialRepo: repo,
    entries: introEntries(),
    commands: [] as string[],
    undoStack: [] as UndoSnapshot[],
    playing: false,
    pulse: { id: 0, events: [] as EngineEvent[] },
    achieved: [] as string[],
    moves: 0,
    hintsShown: 0,
    solutionShown: false,
    result: null as CompletionResult | null,
    resultOpen: false,
  };
}

function evaluateGoals(level: LevelDefinition | null, initial: RepoState, repo: RepoState, commands: string[], previous: string[]): string[] {
  if (!level) return [];
  const ctx = { state: repo, initial, commands };
  return level.goals.filter((goal) => (goal.sticky && previous.includes(goal.id)) || goal.check(ctx)).map((goal) => goal.id);
}

export function scoreStars(moves: number, par: number, hintsUsed: number, solutionShown: boolean): number {
  if (solutionShown) return 1;
  let stars = 3;
  if (moves > par + Math.ceil(par / 2)) stars--;
  if (hintsUsed > 0) stars--;
  return Math.max(1, stars);
}

/**
 * Keeps the browser's copy of the session up to date. Playback sets state many times a second, so writes are coalesced
 * and only the last one lands — with a flush when the page goes away, which is exactly when it matters most.
 */
function attachSessionCache(store: StoreApi<GameState>): () => void {
  if (typeof window === "undefined") return () => {};
  let timer: ReturnType<typeof setTimeout> | null = null;

  const save = () => {
    timer = null;
    const s = store.getState();
    writeSession({
      session: s.session,
      signature: signatureOf(s.session, s.level),
      repo: s.repo,
      initialRepo: s.initialRepo,
      entries: s.entries,
      inputHistory: s.inputHistory,
      commands: s.commands,
      achieved: s.achieved,
      moves: s.moves,
      hintsShown: s.hintsShown,
      solutionShown: s.solutionShown,
    });
  };
  const schedule = () => {
    if (timer === null) timer = setTimeout(save, SAVE_DELAY);
  };
  const flush = () => {
    if (timer === null) return;
    clearTimeout(timer);
    save();
  };

  const unsubscribe = store.subscribe(schedule);
  window.addEventListener("pagehide", flush);
  return () => {
    unsubscribe();
    window.removeEventListener("pagehide", flush);
    flush();
  };
}

export function createGameStore(session: Session): StoreApi<GameState> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const clearTimer = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };
  let detachCache = () => {};

  const store = createStore<GameState>()((set, get) => {
    const pushEntries = (entries: TerminalEntry[], added: TerminalEntry[]) => {
      const next = [...entries, ...added];
      return next.length > MAX_ENTRIES ? next.slice(next.length - MAX_ENTRIES) : next;
    };

    const applyFrame = (frame: Frame) => {
      const s = get();
      let entries = frame.effects.some((effect) => effect.type === "clear-terminal") ? [] : s.entries;
      const added: TerminalEntry[] = [];
      if (frame.announce) added.push({ id: nextId(), kind: "announce", text: frame.announce });
      for (const line of frame.output) added.push({ id: nextId(), kind: "output", line });

      let repo = frame.state;
      let commands = s.commands;
      let undoStack = s.undoStack;
      let moves = s.moves;

      if (frame.effects.some((effect) => effect.type === "undo")) {
        const snapshot = undoStack[undoStack.length - 1];
        if (snapshot) {
          repo = snapshot.repo;
          commands = commands.slice(0, snapshot.commandCount);
          undoStack = undoStack.slice(0, -1);
          added.push({ id: nextId(), kind: "system", text: `↺ Rewound to before: ${snapshot.input}`, tone: "info" });
        } else {
          added.push({ id: nextId(), kind: "system", text: "Nothing to undo yet.", tone: "muted" });
        }
      }

      const undid = frame.effects.some((effect) => effect.type === "undo");
      if (frame.completed?.ok && !undid) {
        commands = [...commands, frame.completed.command];
        if (frame.completed.changed) moves++;
      }

      entries = pushEntries(entries, added);
      set({
        entries,
        repo,
        commands,
        undoStack,
        moves,
        pulse: { id: s.pulse.id + 1, events: frame.events },
        achieved: evaluateGoals(s.level, s.initialRepo, repo, commands, s.achieved),
      });
    };

    const finish = (before: UndoSnapshot) => {
      const s = get();
      const undoStack = !statesEqual(before.repo, s.repo) && !s.undoStack.includes(before) ? [...s.undoStack, before].slice(-50) : s.undoStack;
      set({ playing: false, undoStack });
      if (!s.level || s.result || s.achieved.length !== s.level.goals.length) return;

      const par = levelPar(s.level);
      const stars = scoreStars(s.moves, par, s.hintsShown, s.solutionShown);
      const xp = Math.round((s.level.xp * stars) / 3);
      const xpEarned = useProgress.getState().recordCompletion(s.level.id, { stars, xp, bestMoves: s.moves });
      set({
        result: { stars, xpEarned, xpAvailable: s.level.xp, moves: s.moves, par, hintsUsed: s.hintsShown },
        resultOpen: true,
      });
    };

    const play = (frames: Frame[], index: number, before: UndoSnapshot) => {
      const frame = frames[index];
      if (!frame) {
        finish(before);
        return;
      }
      applyFrame(frame);
      if (frame.effects.some((effect) => effect.type === "undo")) {
        // An undo pops the stack itself; don't push the pre-undo state back on.
        set({ playing: false });
        return;
      }
      const eventful = frame.events.length > 0;
      const delay = index === frames.length - 1 ? 0 : (eventful ? BASE_FRAME_DELAY : QUIET_FRAME_DELAY) / get().speed;
      timer = setTimeout(() => play(frames, index + 1, before), delay);
    };

    const fresh = freshState(session);
    const saved = resumableSession(session, fresh.level);
    return {
      ...resumedState(session, fresh.level, fresh),
      inputHistory: saved?.inputHistory ?? [],
      draft: "",
      focusRequest: 0,
      speed: 1,

      submit: (input) => {
        const s = get();
        if (s.playing) return;
        const text = input.trim();
        const prompt = promptLabel(s.repo);
        if (!text) {
          set({ entries: pushEntries(s.entries, [{ id: nextId(), kind: "input", text: "", prompt }]), draft: "" });
          return;
        }
        const result = engine.execute(text, s.repo, { customCommands: useCustomCommands.getState().commands });
        const inputHistory = s.inputHistory[s.inputHistory.length - 1] === text ? s.inputHistory : [...s.inputHistory, text].slice(-100);
        set({
          entries: pushEntries(s.entries, [{ id: nextId(), kind: "input", text, prompt }]),
          inputHistory,
          draft: "",
          playing: true,
        });
        play(result.frames, 0, { repo: s.repo, commandCount: s.commands.length, input: text });
      },

      setDraft: (draft) => set({ draft }),

      insertCommand: (text) => set((s) => ({ draft: text, focusRequest: s.focusRequest + 1 })),

      undo: () => get().submit("undo"),

      restart: () => {
        clearTimer();
        const s = get();
        set({ ...freshState(s.session), draft: "", focusRequest: s.focusRequest + 1 });
      },

      loadPreset: (presetId) => {
        clearTimer();
        const s = get();
        set({ ...freshState({ kind: "sandbox", presetId }), draft: "", focusRequest: s.focusRequest + 1 });
      },

      revealHint: () => {
        const s = get();
        if (!s.level || s.hintsShown >= s.level.hints.length) return;
        set({ hintsShown: s.hintsShown + 1 });
      },

      revealSolution: () => set({ solutionShown: true }),

      setSpeed: (speed) => set({ speed }),

      closeResult: () => set((s) => ({ resultOpen: false, focusRequest: s.focusRequest + 1 })),

      dispose: () => {
        clearTimer();
        detachCache();
      },
    };
  });

  detachCache = attachSessionCache(store);
  return store;
}

export const GameStoreContext = createContext<StoreApi<GameState> | null>(null);

export function useGameStore(): StoreApi<GameState> {
  const store = useContext(GameStoreContext);
  if (!store) throw new Error("useGame must be used inside <GameStoreContext>");
  return store;
}

export function useGame<T>(selector: (state: GameState) => T): T {
  return useStore(useGameStore(), selector);
}
