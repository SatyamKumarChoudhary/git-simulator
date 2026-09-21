import { beforeEach, describe, expect, it, vi } from "vitest";
import { findLevel } from "@/content";
import { engine } from "@/engine";
import type { Session } from "./game-store";
import { clearSession, readSession, resumableSession, signatureOf, writeSession } from "./session-cache";

/** A localStorage that lives in memory, and can be told to misbehave the way a real one does. */
function memoryStorage(): Storage & { fail: boolean } {
  const map = new Map<string, string>();
  return {
    fail: false,
    get length() {
      return map.size;
    },
    key: (i: number) => [...map.keys()][i] ?? null,
    clear: () => map.clear(),
    getItem(key) {
      if (this.fail) throw new Error("denied");
      return map.get(key) ?? null;
    },
    setItem(key, value) {
      if (this.fail) throw new Error("quota exceeded");
      map.set(key, String(value));
    },
    removeItem: (key: string) => void map.delete(key),
  } as Storage & { fail: boolean };
}

const level = findLevel("first-commit")!.level;
const session: Session = { kind: "level", levelId: "first-commit" };
const repo = engine.build(level.setup);

function snapshot(overrides: Partial<Parameters<typeof writeSession>[0]> = {}) {
  return {
    session,
    signature: signatureOf(session, level),
    repo,
    initialRepo: repo,
    entries: [],
    inputHistory: ["git status"],
    commands: ["git status"],
    achieved: [],
    moves: 1,
    hintsShown: 0,
    solutionShown: false,
    ...overrides,
  };
}

let storage: ReturnType<typeof memoryStorage>;

beforeEach(() => {
  storage = memoryStorage();
  vi.stubGlobal("localStorage", storage);
});

describe("session cache", () => {
  it("has nothing to say before anything is written", () => {
    expect(readSession()).toBeNull();
    expect(resumableSession(session, level)).toBeNull();
  });

  it("puts you back where you were", () => {
    writeSession(snapshot());
    const saved = resumableSession(session, level);
    expect(saved?.commands).toEqual(["git status"]);
    expect(saved?.moves).toBe(1);
    expect(saved?.repo).toEqual(repo);
  });

  it("only resumes the session it belongs to", () => {
    writeSession(snapshot());
    expect(resumableSession({ kind: "level", levelId: "commit-again" }, findLevel("commit-again")!.level)).toBeNull();
    expect(resumableSession({ kind: "sandbox", presetId: "empty" }, null)).toBeNull();
  });

  it("refuses a cache from a level that has since been edited", () => {
    writeSession(snapshot({ signature: "level:first-commit:stale" }));
    expect(readSession()).not.toBeNull();
    expect(resumableSession(session, level)).toBeNull();
  });

  it("forgets a session you left a month ago", () => {
    const now = Date.now();
    writeSession(snapshot(), now - 31 * 24 * 60 * 60 * 1000);
    expect(readSession(now)).toBeNull();
    expect(localStorage.getItem("gitquest-session"), "and clears it out").toBeNull();
  });

  it("keeps only the tail of a long terminal", () => {
    const entries = Array.from({ length: 300 }, (_, id) => ({ id, kind: "system" as const, text: `line ${id}`, tone: "muted" as const }));
    writeSession(snapshot({ entries }));
    const saved = readSession();
    expect(saved?.entries).toHaveLength(120);
    expect(saved?.entries[0].id).toBe(180);
  });

  it("throws away a cache it cannot make sense of", () => {
    localStorage.setItem("gitquest-session", "{not json");
    expect(readSession()).toBeNull();
    expect(localStorage.getItem("gitquest-session")).toBeNull();
  });

  it("throws away a cache written by an older version", () => {
    localStorage.setItem("gitquest-session", JSON.stringify({ ...snapshot(), version: 0, savedAt: Date.now() }));
    expect(readSession()).toBeNull();
  });

  it("carries on when the browser refuses to store anything", () => {
    storage.fail = true;
    expect(writeSession(snapshot())).toBe(false);
    expect(readSession()).toBeNull();
    expect(() => clearSession()).not.toThrow();
  });

  it("notices when a level's setup or goals change", () => {
    const edited = { ...level, setup: [...level.setup, "echo hi > extra.txt"] };
    expect(signatureOf(session, edited)).not.toBe(signatureOf(session, level));
    expect(signatureOf(session, { ...level })).toBe(signatureOf(session, level));
  });
});
