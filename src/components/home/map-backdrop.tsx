"use client";

import { motion, useScroll, useTransform } from "motion/react";

/** Height of one tile of doodles; the layer loops by exactly this much, so the parallax never shows a seam. */
const TILE = 300;
/** How much slower than the page the doodles scroll. */
const PARALLAX = 0.3;

const SIDES_ONLY = "linear-gradient(90deg, #000 0%, #000 16%, transparent 36%, transparent 64%, #000 84%, #000 100%)";

/**
 * The map page's background: a neutral charcoal (or plain light) with a soft light from above, and faint Git doodles —
 * commits, a branch, a merge, a tag — on the sides only. The doodles drift a little slower than the map as you scroll.
 */
export function MapBackdrop() {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, (value) => -((value * PARALLAX) % TILE));

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-page dark:bg-[radial-gradient(ellipse_80%_55%_at_50%_0%,rgb(255_255_255_/_0.06),transparent_70%),radial-gradient(ellipse_90%_60%_at_50%_115%,rgb(0_0_0_/_0.35),transparent_70%),#17191e]"
    >
      <div className="absolute inset-0" style={{ maskImage: SIDES_ONLY, WebkitMaskImage: SIDES_ONLY }}>
        <motion.svg className="absolute inset-x-0 top-0 w-full text-slate-900/[0.06] dark:text-white/[0.07]" style={{ y, height: `calc(100% + ${TILE}px)` }}>
          <defs>
            <pattern id="git-doodles" width="320" height={TILE} patternUnits="userSpaceOnUse">
              <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {/* Three commits in a row */}
                <path d="M 30 40 H 106" />
                <circle cx="24" cy="40" r="6" />
                <circle cx="68" cy="40" r="6" />
                <circle cx="112" cy="40" r="6" />
                {/* A branch splitting off */}
                <path d="M 180 36 V 104 M 180 60 C 180 80, 222 72, 222 98" />
                <circle cx="180" cy="30" r="6" />
                <circle cx="180" cy="110" r="6" />
                <circle cx="222" cy="104" r="6" />
                {/* A tag */}
                <path d="M 34 150 H 72 L 86 164 L 72 178 H 34 Z" />
                <circle cx="46" cy="164" r="3" />
                {/* Two lines merging */}
                <path d="M 136 150 C 136 176, 170 176, 170 200 M 204 150 C 204 176, 170 176, 170 200 V 226" />
                <circle cx="136" cy="144" r="5" />
                <circle cx="204" cy="144" r="5" />
                {/* Little sparkles */}
                <path d="M 260 206 V 222 M 252 214 H 268" />
                <path d="M 60 232 V 244 M 54 238 H 66" />
              </g>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#git-doodles)" />
        </motion.svg>
      </div>
    </div>
  );
}
