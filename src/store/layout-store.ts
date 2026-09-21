"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Panel sizes the reader has dragged, in pixels, keyed by split. A missing key means "leave it to the layout" — nothing
 * is pinned until it is dragged, so the default screen is whatever the design says it should be.
 */
interface LayoutState {
  sizes: Record<string, number>;
  setSize: (id: string, size: number) => void;
  clearSize: (id: string) => void;
  resetSizes: () => void;
}

export const useLayout = create<LayoutState>()(
  persist(
    (set, get) => ({
      sizes: {},
      setSize: (id, size) => set({ sizes: { ...get().sizes, [id]: Math.round(size) } }),
      clearSize: (id) => set({ sizes: Object.fromEntries(Object.entries(get().sizes).filter(([key]) => key !== id)) }),
      resetSizes: () => set({ sizes: {} }),
    }),
    { name: "gitquest-layout", version: 1 },
  ),
);
