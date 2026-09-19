/** One calm ease-in-out glide for everything that moves, so lines stay attached to what they connect. */
export const GLIDE = { duration: 0.75, ease: [0.65, 0, 0.35, 1] } as const;
/** A soft overshoot for things that are born. */
export const POP = [0.34, 1.56, 0.64, 1] as const;
/** Lines drawing themselves in. */
export const DRAW = [0.33, 1, 0.68, 1] as const;
