import { type LevelEntry, findLevel, levelEntries } from "@/content";
import type { LevelRecord } from "@/store/progress-store";

type Records = Record<string, LevelRecord>;

/** A level is playable once the level before it has been completed (the first level always is). */
export function isUnlocked(levelId: string, records: Records): boolean {
  const entry = findLevel(levelId);
  if (!entry) return false;
  if (entry.index === 0) return true;
  return Boolean(records[levelEntries[entry.index - 1].level.id]);
}

export function isCompleted(levelId: string, records: Records): boolean {
  return Boolean(records[levelId]);
}

/** The level the player should play next: the first unfinished one (or the last level when everything is done). */
export function currentEntry(records: Records): LevelEntry {
  return levelEntries.find((entry) => !records[entry.level.id]) ?? levelEntries[levelEntries.length - 1];
}

export function completedCount(records: Records): number {
  return levelEntries.filter((entry) => records[entry.level.id]).length;
}

