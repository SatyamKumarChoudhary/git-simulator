"use client";

import { useSyncExternalStore } from "react";

const subscribeNothing = () => () => {};

/** False during server rendering and hydration, true afterwards — for browser-only data like localStorage. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false,
  );
}
