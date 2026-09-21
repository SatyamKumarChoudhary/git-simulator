"use client";

import { useCallback, useSyncExternalStore } from "react";

/** One MediaQueryList per query, so a component that re-renders often doesn't create one each time. */
const lists = new Map<string, MediaQueryList>();

function listFor(query: string): MediaQueryList {
  const existing = lists.get(query);
  if (existing) return existing;
  const list = window.matchMedia(query);
  lists.set(query, list);
  return list;
}

/** Whether a media query matches. False while rendering on the server, so the markup matches the first paint. */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = listFor(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query],
  );
  const snapshot = useCallback(() => listFor(query).matches, [query]);
  return useSyncExternalStore(subscribe, snapshot, () => false);
}
