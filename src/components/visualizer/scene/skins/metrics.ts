import { FULL_METRICS, LINKED_LIST_SPACING, type ListMetrics } from "../../linked-list/layout";

/** Stations are small round stops with their name underneath, so poles meet the stop's top centre. */
export const RAILWAY_METRICS: ListMetrics = {
  ...FULL_METRICS,
  nodeW: 34,
  nodeH: 34,
  arrow: 4,
  tipGap: 3,
  tipInset: 17,
  pointerReach: 48,
  headWidth: 92,
  spacing: { ...LINKED_LIST_SPACING, padBottom: 100 },
};

/** Planets with their name underneath; route arrows touch the planet's edge. */
export const SPACE_METRICS: ListMetrics = {
  ...FULL_METRICS,
  nodeW: 56,
  nodeH: 56,
  arrow: 10,
  tipGap: 5,
  tipInset: 14,
  pointerReach: 44,
  headWidth: 92,
  spacing: { ...LINKED_LIST_SPACING, padBottom: 104 },
};
