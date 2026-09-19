"use client";

import { TrainFront } from "lucide-react";
import { motion } from "motion/react";
import { COLORS, type ListEdge, type ListNode, type Pointer } from "../../linked-list/layout";
import { nodeAccent, pillStyle } from "../../linked-list/styles";
import { DrawnPath } from "../parts";
import type { SceneSkin } from "../skin";
import { RAILWAY_METRICS as M } from "./metrics";

/** Room for a station's name underneath it. */
const LABEL_W = 184;
const CORNER = 28;

interface Point {
  x: number;
  y: number;
}

/**
 * A metro-map line from `start` to `end`: horizontal, one rounded turn down (or up), horizontal again. The vertical part
 * sits half a column away from the higher stop, so it never runs under a station or its name. The path always has the
 * same commands, so it morphs smoothly when history reshapes.
 */
function metroPath(start: Point, end: Point, col: number): string {
  const upper = start.y <= end.y ? start : end;
  const lower = upper === start ? end : start;
  const toward = Math.sign(lower.x - upper.x) || 1;
  const vx = Math.abs(lower.x - upper.x) > col ? upper.x + toward * (col / 2) : (upper.x + lower.x) / 2;
  const r = Math.min(CORNER, Math.abs(end.y - start.y) / 2, Math.abs(vx - start.x), Math.abs(end.x - vx));
  const sx = Math.sign(vx - start.x) || 1;
  const sy = Math.sign(end.y - start.y) || 1;
  const ex = Math.sign(end.x - vx) || 1;
  return [
    `M ${start.x} ${start.y}`,
    `H ${vx - sx * r}`,
    `Q ${vx} ${start.y} ${vx} ${start.y + sy * r}`,
    `V ${end.y - sy * r}`,
    `Q ${vx} ${end.y} ${vx + ex * r} ${end.y}`,
    `H ${end.x}`,
  ].join(" ");
}

function Backdrop() {
  const line = "color-mix(in srgb, var(--c-canvas-dot) 45%, transparent)";
  return (
    <div
      className="absolute inset-0 bg-canvas"
      style={{ backgroundImage: `linear-gradient(${line} 1px, transparent 1px), linear-gradient(90deg, ${line} 1px, transparent 1px)`, backgroundSize: "56px 56px" }}
    />
  );
}

/** Track from the older station to the newer one, so a new track grows toward the station being built. */
function Track({ edge, delay }: { edge: ListEdge; delay: number }) {
  return (
    <motion.g initial={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.3 } }}>
      <DrawnPath
        d={metroPath(edge.to, edge.from, M.spacing.col)}
        color={edge.reachable ? edge.color : COLORS.edgeFaded}
        width={9}
        delay={delay}
        drawDuration={0.6}
        dash={edge.reachable ? undefined : "1 15"}
      />
    </motion.g>
  );
}

function Station({ node, compact, onClick }: { node: ListNode; compact: boolean; onClick?: (id: string) => void }) {
  return (
    <button
      type="button"
      disabled={compact}
      onClick={() => onClick?.(node.id)}
      title={`${node.id} — ${node.message}`}
      className="group absolute flex flex-col items-center text-center enabled:cursor-pointer"
      style={{ width: LABEL_W, left: -LABEL_W / 2, top: -M.nodeH / 2 }}
    >
      <span
        className="grid shrink-0 place-items-center rounded-full border-[7px] transition-transform duration-200 group-enabled:group-hover:scale-110"
        style={{
          width: M.nodeW,
          height: M.nodeH,
          borderColor: node.conflicted ? COLORS.mergeHead : nodeAccent(node),
          borderStyle: node.reachable ? "solid" : "dashed",
          background: "var(--c-node)",
          boxShadow: "var(--c-node-shadow)",
        }}
      >
        {node.isHead && <span className="size-2.5 rounded-full" style={{ background: COLORS.head }} />}
      </span>
      <span className="mt-2 font-mono text-[14px] font-semibold leading-tight text-ink">{node.shortId}</span>
      <span className="max-w-full truncate px-2 text-[12.5px] leading-snug text-ink-2">{node.message}</span>
    </button>
  );
}

function Sign({ pointer }: { pointer: Pointer }) {
  const box = { width: pointer.width, height: M.pillH, left: -pointer.width / 2, top: -M.pillH / 2, boxShadow: "var(--c-node-shadow)" };
  if (pointer.kind === "head") {
    return (
      <div className="absolute flex items-center justify-center gap-1.5 rounded-full font-mono text-[12.5px] font-bold text-white" style={{ ...box, background: COLORS.head }}>
        <TrainFront className="size-4" strokeWidth={2.25} aria-hidden />
        HEAD
      </div>
    );
  }
  return (
    <div className="absolute flex items-center justify-center rounded-md border-2 font-mono text-[12.5px] font-semibold" style={{ ...box, ...pillStyle(pointer) }}>
      {pointer.name}
    </div>
  );
}

function Placeholder() {
  return (
    <span className="flex flex-col items-center gap-2">
      <span className="block rounded-full border-[3px] border-dashed border-line-strong" style={{ width: M.nodeW, height: M.nodeH }} />
      <span className="text-[13px] text-ink-3">first station goes here</span>
    </span>
  );
}

export const railwaySkin: SceneSkin = {
  metrics: M,
  Backdrop,
  Link: Track,
  Commit: Station,
  Pill: Sign,
  Placeholder,
  pointerHeads: false,
  glowRadius: "9999px",
  guide: [
    {
      visual: <span className="block size-5 rounded-full border-[5px] border-sky-400 bg-surface" />,
      text: (
        <>
          A <b className="font-medium text-ink">station</b> is a commit — a saved snapshot of your files.
        </>
      ),
    },
    {
      visual: (
        <svg width="58" height="14" viewBox="0 0 58 14" aria-hidden>
          <path d="M 6 7 H 52" stroke="#38bdf8" strokeWidth="6" strokeLinecap="round" />
          <circle cx="7" cy="7" r="5" fill="white" stroke="#38bdf8" strokeWidth="3" />
          <circle cx="51" cy="7" r="5" fill="white" stroke="#38bdf8" strokeWidth="3" />
        </svg>
      ),
      text: (
        <>
          The <b className="font-medium text-ink">track</b> joins each station to the one before it. Older is on the left.
        </>
      ),
    },
    {
      visual: <span className="rounded-md border-2 border-sky-400/70 bg-sky-400/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-sky-700 dark:text-sky-300">main</span>,
      text: (
        <>
          A <b className="font-medium text-ink">signpost</b> is a branch. It moves to the newest station when you commit.
        </>
      ),
    },
    {
      visual: (
        <span className="flex items-center gap-1 rounded-full bg-orange-500 px-2 py-0.5 font-mono text-[10px] font-bold text-white">
          <TrainFront className="size-3" strokeWidth={2.5} aria-hidden />
          HEAD
        </span>
      ),
      text: (
        <>
          <b className="font-medium text-ink">The train is you.</b> HEAD rides with your current branch.
        </>
      ),
    },
    {
      visual: <span className="rounded-md border-2 border-dashed border-slate-400/60 px-1.5 py-0.5 font-mono text-[10px] text-ink-2">origin/main</span>,
      text: (
        <>
          Where <b className="font-medium text-ink">GitHub&apos;s</b> main was the last time you fetched.
        </>
      ),
    },
  ],
};
