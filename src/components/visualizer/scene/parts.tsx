"use client";

import { motion } from "motion/react";
import { DRAW, GLIDE } from "./motion";

interface ArrowheadProps {
  x: number;
  y: number;
  direction: "left" | "down";
  color: string;
  length: number;
  half?: number;
  /** When the head pops in. */
  delay: number;
  /** When it starts gliding to a new position. */
  moveDelay?: number;
}

export function Arrowhead({ x, y, direction, color, length, half = 6, delay, moveDelay = 0 }: ArrowheadProps) {
  const points = direction === "left" ? `0,0 ${length},-${half} ${length},${half}` : `0,0 -${half},-${length} ${half},-${length}`;
  return (
    <motion.polygon
      points={points}
      style={{ fill: color }}
      initial={{ x, y, scale: 0 }}
      animate={{ x, y, scale: 1 }}
      transition={{ x: { ...GLIDE, delay: moveDelay }, y: { ...GLIDE, delay: moveDelay }, scale: { delay, type: "spring", stiffness: 480, damping: 18 } }}
    />
  );
}

interface DrawnPathProps {
  d: string;
  color: string;
  width: number;
  /** When a new path starts drawing itself. */
  delay: number;
  /** Dashed paths fade in instead of drawing (a dash pattern and a drawing stroke can't share the dash array). */
  dash?: string;
  /** Glide delay when the path's shape changes. */
  moveDelay?: number;
  drawDuration?: number;
  opacity?: number;
}

/** A path that draws itself in when it first appears and glides smoothly whenever its shape changes. */
export function DrawnPath({ d, color, width, delay, dash, moveDelay = 0, drawDuration = 0.55, opacity = 1 }: DrawnPathProps) {
  return (
    <motion.path
      fill="none"
      style={{ stroke: color }}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray={dash}
      initial={dash ? { d, opacity: 0 } : { d, pathLength: 0, opacity }}
      animate={dash ? { d, opacity } : { d, pathLength: 1, opacity }}
      transition={{ d: { ...GLIDE, delay: moveDelay }, pathLength: { duration: drawDuration, delay, ease: DRAW }, opacity: { duration: 0.45, delay: dash ? delay : 0 } }}
    />
  );
}
