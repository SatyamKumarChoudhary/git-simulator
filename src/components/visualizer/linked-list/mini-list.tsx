"use client";

import { AnimatePresence, motion } from "motion/react";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { RepoState } from "@/engine";
import { COLORS, type ListEdge, type ListNode, MINI_METRICS as M, type Pointer, horizontalBounds, layoutLinkedList } from "./layout";
import { nodeAccent, nodeBorder, pillStyle } from "./styles";

/** Same glide as the board, a little quicker to suit the smaller size. */
const MOVE = { duration: 0.65, ease: [0.65, 0, 0.35, 1] } as const;
const HALF_HEAD = 3.5;
/** Breathing room on each side of the outermost commit or pill. */
const PAD_X = 8;

interface MiniListProps {
  repo: RepoState;
  /** Commits missing from this repository are marked "new". */
  baseline?: RepoState;
}

/** A small, non-interactive linked-list diagram that fits its container's width. Changes between repos morph smoothly. */
export function MiniList({ repo, baseline }: MiniListProps) {
  const layout = useMemo(() => layoutLinkedList(repo, M), [repo]);
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const empty = layout.nodes.length === 0;
  // Fit what is actually drawn (pills can stick out past the last commit), not the layout's padded box.
  const bounds = useMemo(() => horizontalBounds(layout, M), [layout]);
  const contentWidth = bounds.right - bounds.left + PAD_X * 2;
  const scale = width > 0 ? Math.min(1, width / contentWidth) : 1;
  const offsetX = Math.max(0, (width - contentWidth * scale) / 2) + (PAD_X - bounds.left) * scale;

  return (
    <div ref={ref} className="relative w-full">
      {width > 0 && (
        <motion.div className="relative overflow-hidden" initial={false} animate={{ height: empty ? 64 : layout.height * scale }} transition={MOVE}>
          <AnimatePresence>
            {empty && (
              <motion.div
                key="empty"
                className="absolute inset-0 grid place-items-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <span className="rounded-lg border border-dashed border-line-strong bg-surface px-3 py-1.5 text-[11px] text-ink-3">No commits yet</span>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            className="absolute left-0 top-0 origin-top-left"
            style={{ width: layout.width, height: layout.height }}
            initial={false}
            animate={{ scale, x: offsetX }}
            transition={MOVE}
          >
            <svg className="absolute inset-0 overflow-visible" width={layout.width} height={layout.height}>
              <AnimatePresence>
                {layout.edges.map((edge) => (
                  <MiniEdge key={edge.id} edge={edge} />
                ))}
                {layout.pointers.map((pointer) => (
                  <MiniPointerArrow key={`arrow-${pointer.key}`} pointer={pointer} />
                ))}
              </AnimatePresence>
            </svg>

            <AnimatePresence>
              {layout.nodes.map((node) => (
                <MiniCommit key={node.id} node={node} isNew={Boolean(baseline && !baseline.commits[node.id])} />
              ))}
            </AnimatePresence>

            <AnimatePresence>
              {layout.pointers.map((pointer) => (
                <MiniPill key={pointer.key} pointer={pointer} />
              ))}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

function MiniEdge({ edge }: { edge: ListEdge }) {
  const color = edge.reachable ? COLORS.edge : COLORS.edgeFaded;
  return (
    <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
      <motion.path
        fill="none"
        style={{ stroke: color }}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeDasharray={edge.reachable ? undefined : "4 4"}
        initial={{ d: edge.d }}
        animate={{ d: edge.d }}
        transition={MOVE}
      />
      <motion.polygon
        points={`0,0 ${M.arrow},-${HALF_HEAD} ${M.arrow},${HALF_HEAD}`}
        style={{ fill: color }}
        initial={{ x: edge.tipX, y: edge.tipY }}
        animate={{ x: edge.tipX, y: edge.tipY }}
        transition={MOVE}
      />
    </motion.g>
  );
}

function MiniPointerArrow({ pointer }: { pointer: Pointer }) {
  return (
    <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
      <motion.path
        fill="none"
        style={{ stroke: pointer.color }}
        strokeWidth={1.75}
        strokeLinecap="round"
        initial={{ d: pointer.arrow }}
        animate={{ d: pointer.arrow }}
        transition={MOVE}
      />
      <motion.polygon
        points={`0,0 -${HALF_HEAD},-${M.arrow} ${HALF_HEAD},-${M.arrow}`}
        style={{ fill: pointer.color }}
        initial={{ x: pointer.tipX, y: pointer.tipY }}
        animate={{ x: pointer.tipX, y: pointer.tipY }}
        transition={MOVE}
      />
    </motion.g>
  );
}

function MiniCommit({ node, isNew }: { node: ListNode; isNew: boolean }) {
  const accent = nodeAccent(node);
  return (
    <motion.div
      className="absolute left-0 top-0"
      initial={{ x: node.x, y: node.y, opacity: 0, scale: 0.6 }}
      animate={{ x: node.x, y: node.y, opacity: node.reachable ? 1 : 0.5, scale: 1 }}
      exit={{ opacity: 0, scale: 0.7, transition: { duration: 0.25 } }}
      transition={{ x: MOVE, y: MOVE, opacity: { duration: 0.3 }, scale: { duration: 0.5, ease: [0.34, 1.56, 0.64, 1] } }}
    >
      <div
        className="absolute flex overflow-hidden rounded-lg border"
        style={{
          width: M.nodeW,
          height: M.nodeH,
          left: -M.nodeW / 2,
          top: -M.nodeH / 2,
          background: "var(--c-node)",
          borderColor: nodeBorder(node),
          borderStyle: node.reachable ? "solid" : "dashed",
          boxShadow: "0 1px 2px rgb(15 23 42 / 0.12), 0 4px 10px -6px rgb(15 23 42 / 0.3)",
        }}
      >
        <span className="w-[3px] shrink-0" style={{ background: accent }} />
        <span className="flex min-w-0 flex-1 flex-col justify-center gap-[3px] px-1.5 leading-none">
          {isNew ? (
            <span className="font-mono text-[9.5px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">✦ new</span>
          ) : (
            <span className="font-mono text-[10px] font-semibold text-ink">{node.shortId}</span>
          )}
          <span className="truncate text-[9.5px] text-ink-2">{node.message}</span>
        </span>
      </div>
    </motion.div>
  );
}

function MiniPill({ pointer }: { pointer: Pointer }) {
  return (
    <motion.div
      className="absolute left-0 top-0 z-10"
      initial={{ x: pointer.x, y: pointer.y, opacity: 0, scale: 0.5 }}
      animate={{ x: pointer.x, y: pointer.y, opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
      transition={{ x: MOVE, y: MOVE, opacity: { duration: 0.25 }, scale: { type: "spring", stiffness: 420, damping: 20 } }}
    >
      <div
        className="absolute flex items-center justify-center rounded-full border font-mono text-[10px] font-semibold leading-none"
        style={{ width: pointer.width, height: M.pillH, left: -pointer.width / 2, top: -M.pillH / 2, ...pillStyle(pointer) }}
      >
        {pointer.name}
      </div>
    </motion.div>
  );
}
