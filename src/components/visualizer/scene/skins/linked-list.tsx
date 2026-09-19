"use client";

import { motion } from "motion/react";
import { COLORS, FULL_METRICS as M, type ListEdge, type ListNode, type Pointer } from "../../linked-list/layout";
import { nodeAccent, nodeBorder, pillStyle } from "../../linked-list/styles";
import { Arrowhead, DrawnPath } from "../parts";
import type { SceneSkin } from "../skin";

function Backdrop() {
  return (
    <div
      className="absolute inset-0 bg-canvas"
      style={{ backgroundImage: "radial-gradient(var(--c-canvas-dot) 1.2px, transparent 1.2px)", backgroundSize: "26px 26px" }}
    />
  );
}

/** "This commit's parent is that one": drawn from the child back to the parent. */
function ParentArrow({ edge, delay }: { edge: ListEdge; delay: number }) {
  const color = edge.reachable ? COLORS.edge : COLORS.edgeFaded;
  return (
    <motion.g initial={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.3 } }}>
      <DrawnPath d={edge.d} color={color} width={2.5} delay={delay} dash={edge.reachable ? undefined : "6 7"} />
      <Arrowhead x={edge.tipX} y={edge.tipY} direction="left" color={color} length={M.arrow} delay={delay + 0.45} />
    </motion.g>
  );
}

function CommitCard({ node, compact, onClick }: { node: ListNode; compact: boolean; onClick?: (id: string) => void }) {
  return (
    <button
      type="button"
      disabled={compact}
      onClick={() => onClick?.(node.id)}
      title={`${node.id} — ${node.message}`}
      className="absolute flex overflow-hidden rounded-2xl border-[1.5px] text-left transition-transform duration-200 enabled:cursor-pointer enabled:hover:-translate-y-0.5"
      style={{
        width: M.nodeW,
        height: M.nodeH,
        left: -M.nodeW / 2,
        top: -M.nodeH / 2,
        background: "var(--c-node)",
        borderColor: nodeBorder(node),
        borderStyle: node.reachable ? "solid" : "dashed",
        boxShadow: "var(--c-node-shadow)",
      }}
    >
      <span className="w-1.5 shrink-0" style={{ background: nodeAccent(node) }} />
      <span className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 px-3.5">
        <span className="font-mono text-[14px] font-semibold tracking-tight text-ink">{node.shortId}</span>
        <span className="truncate text-[12.5px] text-ink-2">{node.message}</span>
      </span>
    </button>
  );
}

function PointerPill({ pointer }: { pointer: Pointer }) {
  return (
    <div
      className="absolute flex items-center justify-center rounded-full border-[1.5px] font-mono text-[12.5px] font-semibold"
      style={{
        width: pointer.width,
        height: M.pillH,
        left: -pointer.width / 2,
        top: -M.pillH / 2,
        ...pillStyle(pointer),
        boxShadow: "var(--c-node-shadow)",
      }}
    >
      {pointer.name}
    </div>
  );
}

function Placeholder() {
  return (
    <span
      className="flex items-center justify-center rounded-2xl border-[1.5px] border-dashed border-line-strong bg-surface text-[13px] text-ink-3"
      style={{ width: M.nodeW, height: M.nodeH }}
    >
      first commit goes here
    </span>
  );
}

export const linkedListSkin: SceneSkin = {
  metrics: M,
  Backdrop,
  Link: ParentArrow,
  Commit: CommitCard,
  Pill: PointerPill,
  Placeholder,
  pointerHeads: true,
  glowRadius: "16px",
  guide: [
    {
      visual: (
        <span className="flex h-6 w-[58px] overflow-hidden rounded-md border border-line-strong bg-surface">
          <span className="w-1 bg-sky-400" />
          <span className="px-1.5 font-mono text-[10px] leading-[22px] text-ink">a1b2c3</span>
        </span>
      ),
      text: (
        <>
          A <b className="font-medium text-ink">commit</b> — a saved snapshot of your files.
        </>
      ),
    },
    {
      visual: (
        <svg width="58" height="12" viewBox="0 0 58 12" aria-hidden>
          <path d="M 56 6 H 10" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
          <polygon points="1,6 10,1 10,11" fill="#64748b" />
        </svg>
      ),
      text: (
        <>
          Each commit <b className="font-medium text-ink">points back</b> to the commit before it.
        </>
      ),
    },
    {
      visual: <span className="rounded-full border border-sky-400/60 bg-sky-400/10 px-2.5 py-0.5 font-mono text-[10px] text-sky-700 dark:text-sky-300">main</span>,
      text: (
        <>
          A <b className="font-medium text-ink">branch</b> — a label that moves forward when you commit.
        </>
      ),
    },
    {
      visual: <span className="rounded-full bg-orange-500 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-white">HEAD</span>,
      text: (
        <>
          <b className="font-medium text-ink">You are here.</b> HEAD points at your current branch.
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
