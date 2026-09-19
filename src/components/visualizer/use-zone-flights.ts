"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { type FlightPlan, type ZonesModel, cardKey, planFlights } from "./zones-model";

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface Launch {
  flight: FlightPlan;
  /** Where the file copy took off, relative to the container. */
  from: Rect;
  /** Where it lands, relative to the container. */
  to: Rect;
  /** The card waiting at the landing spot (hidden until touchdown). */
  target: HTMLElement;
  /** Position in this batch, for staggering several files. */
  index: number;
  /** The file stays where it took off (git add copies it); otherwise it moved. */
  source: HTMLElement | null;
}

export type LaunchFlight = (container: HTMLElement, launch: Launch) => void;

const relativeRect = (rect: DOMRect, base: DOMRect): Rect => ({
  left: rect.left - base.left,
  top: rect.top - base.top,
  width: rect.width,
  height: rect.height,
});

/**
 * Detects file copies moving between zones (git add, git commit, unstaging) and hands each one to `launch`,
 * which animates a card from where it was to where it lands.
 */
export function useZoneFlights(zones: ZonesModel, launch: LaunchFlight) {
  const [tracked, setTracked] = useState<{ zones: ZonesModel; flights: FlightPlan[] }>({ zones, flights: [] });
  if (tracked.zones !== zones) setTracked({ zones, flights: planFlights(tracked.zones, zones) });

  const containerRef = useRef<HTMLDivElement>(null);
  const cardEls = useRef(new Map<string, HTMLElement>());
  const lastRects = useRef(new Map<string, Rect>());

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const base = container.getBoundingClientRect();
    const current = new Set([...tracked.zones.work, ...tracked.zones.stage, ...tracked.zones.repo].map(cardKey));
    tracked.flights.forEach((flight, index) => {
      const from = lastRects.current.get(flight.from);
      const target = cardEls.current.get(flight.to);
      const source = current.has(flight.from) ? (cardEls.current.get(flight.from) ?? null) : null;
      if (from && target) launch(container, { flight, from, to: relativeRect(target.getBoundingClientRect(), base), target, index, source });
    });
  }, [tracked.flights, tracked.zones, launch]);

  // Remember where every card is, so the next flight knows where it took off from.
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const base = container.getBoundingClientRect();
    const rects = new Map<string, Rect>();
    cardEls.current.forEach((el, key) => rects.set(key, relativeRect(el.getBoundingClientRect(), base)));
    lastRects.current = rects;
  });

  const registerCard = (key: string) => (el: HTMLElement | null) => {
    if (el) cardEls.current.set(key, el);
    else cardEls.current.delete(key);
  };

  /** Card key → its position in the current batch of landings. */
  const landing = new Map(tracked.flights.map((flight, index) => [flight.to, index]));
  return { containerRef, registerCard, landing };
}
