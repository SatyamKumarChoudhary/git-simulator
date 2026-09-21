/**
 * Where you were, kept in the browser.
 *
 * There is no account and no server: if a reader closes the tab halfway through a level, the only place that half-done
 * repository can live is their own browser. This module is the whole of that contract — what gets kept, for how long,
 * and every reason a cache is thrown away rather than restored into something that no longer makes sense.
 */
import type { LevelDefinition } from "@/content";
import type { RepoState } from "@/engine";
import type { Session, TerminalEntry } from "./game-store";

const KEY = "gitquest-session";
/** Bumped when the shape below changes, so an old cache is dropped instead of half-read. */
const VERSION = 1;
/** The tail of the terminal is enough to pick up the thread, and keeps the cache small. */
const MAX_ENTRIES = 120;
/** Older than this and you have long since moved on. */
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

/** Everything needed to put a reader back exactly where they were. */
export interface SessionSnapshot {
  version: number;
  savedAt: number;
  session: Session;
  /** Changes when the level itself changes, so an edited level never resumes onto a board that no longer fits it. */
  signature: string;
  repo: RepoState;
  initialRepo: RepoState;
  entries: TerminalEntry[];
  inputHistory: string[];
  commands: string[];
  achieved: string[];
  moves: number;
  hintsShown: number;
  solutionShown: boolean;
}

/** localStorage is missing while rendering on the server, and throws in some privacy modes. Never let that matter. */
function storage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/** FNV-1a: small, fast, and good enough to notice that a level was edited. */
function hash(text: string): string {
  let value = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    value ^= text.charCodeAt(i);
    value = Math.imul(value, 0x01000193);
  }
  return (value >>> 0).toString(36);
}

/** A short, stable fingerprint of what a level asks — its setup, its goals and how many hints it has. */
export function signatureOf(session: Session, level: LevelDefinition | null): string {
  if (session.kind === "sandbox") return `sandbox:${session.presetId}`;
  if (!level) return "unknown";
  const parts = [level.id, level.setup.join(" ;; "), level.goals.map((goal) => goal.id).join(","), String(level.hints.length)];
  return `level:${level.id}:${hash(parts.join(" || "))}`;
}

function sameSession(a: Session, b: Session): boolean {
  if (a.kind === "level" && b.kind === "level") return a.levelId === b.levelId;
  if (a.kind === "sandbox" && b.kind === "sandbox") return a.presetId === b.presetId;
  return false;
}

/** The cache as it is on disk, or null if there isn't one, it can't be read, or it is too old to be useful. */
export function readSession(now = Date.now()): SessionSnapshot | null {
  const store = storage();
  if (!store) return null;
  let raw: string | null = null;
  try {
    raw = store.getItem(KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  let snapshot: SessionSnapshot | null = null;
  try {
    snapshot = JSON.parse(raw) as SessionSnapshot;
  } catch {
    clearSession();
    return null;
  }
  const usable = snapshot?.version === VERSION && Boolean(snapshot.session) && Boolean(snapshot.repo) && snapshot.savedAt > 0;
  if (!usable) {
    clearSession();
    return null;
  }
  if (now - snapshot!.savedAt > MAX_AGE_MS) {
    clearSession();
    return null;
  }
  return snapshot;
}

/** The cache, but only if it belongs to this session and the level has not changed underneath it. */
export function resumableSession(session: Session, level: LevelDefinition | null, now = Date.now()): SessionSnapshot | null {
  const snapshot = readSession(now);
  if (!snapshot || !sameSession(snapshot.session, session)) return null;
  return snapshot.signature === signatureOf(session, level) ? snapshot : null;
}

/** Writes the cache. A full disk or a locked-down browser is not worth an error: the work is simply not kept. */
export function writeSession(snapshot: Omit<SessionSnapshot, "version" | "savedAt">, now = Date.now()): boolean {
  const store = storage();
  if (!store) return false;
  try {
    store.setItem(KEY, JSON.stringify({ ...snapshot, entries: snapshot.entries.slice(-MAX_ENTRIES), version: VERSION, savedAt: now }));
    return true;
  } catch {
    return false;
  }
}

export function clearSession(): void {
  try {
    storage()?.removeItem(KEY);
  } catch {
    // Nothing to do: the cache is a convenience, never a requirement.
  }
}
