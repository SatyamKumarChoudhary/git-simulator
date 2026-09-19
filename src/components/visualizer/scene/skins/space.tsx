"use client";

import { Rocket } from "lucide-react";
import { motion } from "motion/react";
import { COLORS, type ListEdge, type ListNode, type Pointer } from "../../linked-list/layout";
import { pillStyle } from "../../linked-list/styles";
import { Arrowhead, DrawnPath } from "../parts";
import type { SceneSkin } from "../skin";
import { SPACE_METRICS as M } from "./metrics";

/** Room for a planet's name underneath it. */
const LABEL_W = 184;
const ROUTE = "rgb(148 163 184 / 0.85)";
const ROUTE_FADED = "rgb(100 116 139 / 0.6)";

const stars = (points: Array<[number, number, number, number]>) =>
  points.map(([x, y, size, alpha]) => `radial-gradient(${size}px ${size}px at ${x}px ${y}px, rgb(255 255 255 / ${alpha}), transparent)`).join(", ");

const STILL_STARS = stars([
  [22, 34, 1.2, 0.7],
  [118, 80, 1, 0.5],
  [204, 152, 1.4, 0.8],
  [64, 196, 1, 0.45],
  [168, 20, 1, 0.55],
  [236, 226, 1.2, 0.6],
]);
const TWINKLING_STARS = stars([
  [60, 110, 1.8, 0.9],
  [300, 40, 1.5, 0.8],
  [220, 270, 1.6, 0.85],
]);

function Backdrop() {
  return (
    <div
      className="absolute inset-0"
      style={{ background: "radial-gradient(ellipse 80% 60% at 12% 0%, #18214a 0%, transparent 60%), radial-gradient(ellipse 70% 60% at 100% 100%, #221943 0%, transparent 60%), #070a18" }}
    >
      <div className="absolute inset-0" style={{ backgroundImage: STILL_STARS, backgroundSize: "260px 240px" }} />
      <motion.div
        className="absolute inset-0"
        style={{ backgroundImage: TWINKLING_STARS, backgroundSize: "380px 320px" }}
        animate={{ opacity: [0.2, 0.9, 0.2] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

/** Each planet's route points back to the planet before it. */
function Route({ edge, delay }: { edge: ListEdge; delay: number }) {
  const color = edge.reachable ? ROUTE : ROUTE_FADED;
  return (
    <motion.g initial={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.3 } }}>
      <DrawnPath d={edge.d} color={color} width={2.5} delay={delay} dash={edge.reachable ? undefined : "5 8"} />
      <Arrowhead x={edge.tipX} y={edge.tipY} direction="left" color={color} length={M.arrow} delay={delay + 0.45} />
    </motion.g>
  );
}

function Planet({ node, compact, onClick }: { node: ListNode; compact: boolean; onClick?: (id: string) => void }) {
  const color = node.reachable ? node.color : "#64748b";
  return (
    <button
      type="button"
      disabled={compact}
      onClick={() => onClick?.(node.id)}
      title={`${node.id} — ${node.message}`}
      className="group absolute flex flex-col items-center text-center enabled:cursor-pointer"
      style={{ width: LABEL_W, left: -LABEL_W / 2, top: -M.nodeH / 2 }}
    >
      <span className="relative block shrink-0 transition-transform duration-200 group-enabled:group-hover:scale-110" style={{ width: M.nodeW, height: M.nodeH }}>
        {node.isHead && (
          <motion.span
            className="absolute -inset-[9px] rounded-full border-2 border-dashed"
            style={{ borderColor: node.conflicted ? COLORS.mergeHead : COLORS.head }}
            animate={{ rotate: 360 }}
            transition={{ duration: 16, repeat: Infinity, ease: "linear" }}
          />
        )}
        <span
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle at 32% 28%, color-mix(in srgb, ${color} 30%, #ffffff) 0%, ${color} 48%, color-mix(in srgb, ${color} 50%, #070a18) 100%)`,
            boxShadow: `0 0 28px -2px color-mix(in srgb, ${color} 55%, transparent)`,
          }}
        />
      </span>
      <span className="mt-2.5 font-mono text-[14px] font-semibold leading-tight text-ink">{node.shortId}</span>
      <span className="max-w-full truncate px-2 text-[12.5px] leading-snug text-ink-2">{node.message}</span>
    </button>
  );
}

function Beacon({ pointer }: { pointer: Pointer }) {
  const box = { width: pointer.width, height: M.pillH, left: -pointer.width / 2, top: -M.pillH / 2 };
  if (pointer.kind === "head") {
    return (
      <div
        className="absolute flex items-center justify-center gap-1.5 rounded-full font-mono text-[12.5px] font-bold text-white"
        style={{ ...box, background: COLORS.head, boxShadow: "0 0 22px -4px rgb(249 115 22 / 0.8)" }}
      >
        <Rocket className="size-4" strokeWidth={2.25} aria-hidden />
        HEAD
      </div>
    );
  }
  return (
    <div
      className="absolute flex items-center justify-center rounded-full border-[1.5px] font-mono text-[12.5px] font-semibold"
      style={{ ...box, ...pillStyle(pointer), boxShadow: `0 0 18px -6px ${pointer.color}` }}
    >
      {pointer.name}
    </div>
  );
}

function Placeholder() {
  return (
    <span className="flex flex-col items-center gap-2">
      <span className="block rounded-full border-2 border-dashed border-line-strong" style={{ width: M.nodeW, height: M.nodeH }} />
      <span className="text-[13px] text-ink-3">first planet goes here</span>
    </span>
  );
}

export const spaceSkin: SceneSkin = {
  metrics: M,
  Backdrop,
  Link: Route,
  Commit: Planet,
  Pill: Beacon,
  Placeholder,
  pointerHeads: true,
  glowRadius: "9999px",
  dark: true,
  guide: [
    {
      visual: <span className="block size-5 rounded-full" style={{ background: "radial-gradient(circle at 32% 28%, #bae6fd, #38bdf8 50%, #0c4a6e)" }} />,
      text: (
        <>
          A <b className="font-medium text-ink">planet</b> is a commit — a saved snapshot of your files.
        </>
      ),
    },
    {
      visual: (
        <svg width="58" height="12" viewBox="0 0 58 12" aria-hidden>
          <path d="M 56 6 H 10" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
          <polygon points="1,6 10,1 10,11" fill="#94a3b8" />
        </svg>
      ),
      text: (
        <>
          Each planet&apos;s <b className="font-medium text-ink">route</b> points back to the planet before it.
        </>
      ),
    },
    {
      visual: <span className="rounded-full border border-sky-400/60 bg-sky-400/10 px-2.5 py-0.5 font-mono text-[10px] text-sky-700 dark:text-sky-300">main</span>,
      text: (
        <>
          A <b className="font-medium text-ink">beacon</b> is a branch. It jumps to the newest planet when you commit.
        </>
      ),
    },
    {
      visual: (
        <span className="flex items-center gap-1 rounded-full bg-orange-500 px-2 py-0.5 font-mono text-[10px] font-bold text-white">
          <Rocket className="size-3" strokeWidth={2.5} aria-hidden />
          HEAD
        </span>
      ),
      text: (
        <>
          <b className="font-medium text-ink">The ship is you.</b> HEAD flies with your current branch.
        </>
      ),
    },
    {
      visual: <span className="rounded-full border border-dashed border-slate-400/60 px-2 py-0.5 font-mono text-[10px] text-ink-2">origin/main</span>,
      text: (
        <>
          Where <b className="font-medium text-ink">GitHub&apos;s</b> main was the last time you fetched.
        </>
      ),
    },
  ],
};
