"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface LevelRecord {
  stars: number;
  xp: number;
  bestMoves: number;
}

interface ProgressState {
  levels: Record<string, LevelRecord>;
  /** Saves a completion, keeping the best result. Returns the XP newly earned. */
  recordCompletion: (levelId: string, result: LevelRecord) => number;
  resetProgress: () => void;
}

export const useProgress = create<ProgressState>()(
  persist(
    (set, get) => ({
      levels: {},
      recordCompletion: (levelId, result) => {
        const previous = get().levels[levelId];
        const best: LevelRecord = previous
          ? {
              stars: Math.max(previous.stars, result.stars),
              xp: Math.max(previous.xp, result.xp),
              bestMoves: Math.min(previous.bestMoves, result.bestMoves),
            }
          : result;
        set({ levels: { ...get().levels, [levelId]: best } });
        return best.xp - (previous?.xp ?? 0);
      },
      resetProgress: () => set({ levels: {} }),
    }),
    { name: "gitquest-progress", version: 1 },
  ),
);

