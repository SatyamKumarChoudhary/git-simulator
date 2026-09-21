"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useHydrated } from "@/lib/use-hydrated";

export type PlayfulThemeId = "railway" | "galaxy";
/** "clean" is the linked-list view; "railway" draws it as a metro map and "galaxy" as planets in space. */
export type SceneThemeId = "clean" | PlayfulThemeId;

export const DEFAULT_THEME: SceneThemeId = "clean";

export type Appearance = "light" | "dark";

interface SettingsState {
  theme: SceneThemeId;
  appearance: Appearance;
  muted: boolean;
  setTheme: (theme: SceneThemeId) => void;
  setAppearance: (appearance: Appearance) => void;
  toggleMuted: () => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      theme: DEFAULT_THEME,
      appearance: "dark",
      muted: false,
      setTheme: (theme) => set({ theme }),
      setAppearance: (appearance) => {
        document.documentElement.dataset.theme = appearance;
        set({ appearance });
      },
      toggleMuted: () => set((s) => ({ muted: !s.muted })),
    }),
    {
      name: "gitquest-settings",
      version: 3,
      // Earlier versions defaulted to playful views; start everyone on the clean view and the dark look.
      migrate: (persisted) => ({ ...(persisted as SettingsState), theme: DEFAULT_THEME, appearance: "dark" }),
    },
  ),
);

/** The chosen scene theme — the default until hydration so server and client HTML match. */
export function useSceneTheme(): SceneThemeId {
  const hydrated = useHydrated();
  const theme = useSettings((s) => s.theme);
  return hydrated ? theme : DEFAULT_THEME;
}

export function useMuted(): boolean {
  const hydrated = useHydrated();
  const muted = useSettings((s) => s.muted);
  return hydrated ? muted : true;
}
