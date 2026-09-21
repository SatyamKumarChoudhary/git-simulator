/** Keeps a panel size inside the room it has: never below `min`, never past `maxRatio` of the space it lives in. */
export function clampSize(value: number, { min, maxRatio, room }: { min: number; maxRatio: number; room: number }): number {
  const max = room > 0 ? room * maxRatio : Number.POSITIVE_INFINITY;
  // A container too small for the minimum gets the minimum: a squashed panel is worse than a scrollbar.
  return Math.round(Math.max(min, Math.min(value, Math.max(min, max))));
}
