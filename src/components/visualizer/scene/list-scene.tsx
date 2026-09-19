"use client";

import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { useMemo } from "react";
import type { EngineEvent, RepoState } from "@/engine";
import { branchColor } from "@/lib/theme";
import { COLORS, type ListNode, type Pointer, layoutLinkedList, pillWidth } from "../linked-list/layout";
import type { SceneProps } from "./common";
import { GLIDE, POP } from "./motion";
import { Arrowhead, DrawnPath } from "./parts";
import type { SceneSkin } from "./skin";
import { SceneViewport } from "./viewport";

interface Choreography {
  newCommits: Set<string>;
  /** Commits to briefly light up (new commits, where HEAD just arrived). */
  spotlight: Set<string>;
  /** New links wait until their commit has landed… */
  edgeDelay: number;
  /** …and pointers move last, once the new commit and its link exist. */
  pointerDelay: number;
}

function choreograph(events: EngineEvent[]): Choreography {
  const newCommits = new Set(events.flatMap((event) => (event.type === "commit" ? [event.id] : [])));
  const spotlight = new Set(newCommits);
  for (const event of events) {
    if (event.type === "head-moved" || event.type === "fast-forward" || event.type === "reset") spotlight.add(event.to);
  }
  const committing = newCommits.size > 0;
  return { newCommits, spotlight, edgeDelay: committing ? 0.45 : 0, pointerDelay: committing ? 0.8 : 0 };
}

/** The commit history drawn left → right as a linked list, in the look of the given skin. */
export function ListScene({ skin, repo, pulse, compact = false, onCommitClick }: SceneProps & { skin: SceneSkin }) {
  const layout = useMemo(() => layoutLinkedList(repo, skin.metrics), [repo, skin.metrics]);
  const plan = useMemo(() => choreograph(pulse.events), [pulse]);
  // Links that change lanes go underneath, so every straight line (e.g. main) stays one unbroken colour on top.
  const edges = useMemo(() => [...layout.edges].sort((a, b) => Number(a.from.y === a.to.y) - Number(b.from.y === b.to.y)), [layout]);

  const scene =
    layout.nodes.length === 0 ? (
      <EmptyScene skin={skin} repo={repo} />
    ) : (
      <SceneViewport
        width={layout.width}
        height={layout.height}
        focusX={layout.headNodeX ?? undefined}
        compact={compact}
        maxScale={1}
        backdrop={<skin.Backdrop />}
      >
        <svg className="absolute inset-0 overflow-visible" width={layout.width} height={layout.height}>
          <AnimatePresence>
            {edges.map((edge) => (
              <skin.Link key={`${edge.id}:${edge.reachable}`} edge={edge} delay={plan.newCommits.has(edge.child) ? plan.edgeDelay : 0} />
            ))}
          </AnimatePresence>
          <AnimatePresence>
            {layout.pointers.map((pointer) => (
              <PointerLine key={`line-${pointer.key}`} pointer={pointer} skin={skin} delay={plan.pointerDelay} />
            ))}
          </AnimatePresence>
        </svg>

        <AnimatePresence>
          {layout.nodes.map((node) => {
            const isNew = plan.newCommits.has(node.id);
            const birth = (node.copiedFrom && layout.positions.get(node.copiedFrom)) || (isNew && layout.positions.get(firstParent(repo, node.id))) || null;
            return (
              <CommitSlot key={node.id} node={node} skin={skin} isNew={isNew} birth={birth} spotlight={plan.spotlight.has(node.id) ? pulse.id : null}>
                <skin.Commit node={node} compact={compact} onClick={onCommitClick} />
              </CommitSlot>
            );
          })}
        </AnimatePresence>

        <AnimatePresence>
          {layout.pointers.map((pointer) => (
            <PointerSlot key={pointer.key} pointer={pointer} delay={plan.pointerDelay}>
              <skin.Pill pointer={pointer} />
            </PointerSlot>
          ))}
        </AnimatePresence>
      </SceneViewport>
    );

  return skin.dark ? (
    <div data-theme="dark" className="h-full">
      {scene}
    </div>
  ) : (
    scene
  );
}

function firstParent(repo: RepoState, id: string): string {
  return repo.commits[id]?.parents[0] ?? "";
}

/** From a pointer down to what it points at: a branch/tag to its commit, HEAD to its branch. */
function PointerLine({ pointer, skin, delay }: { pointer: Pointer; skin: SceneSkin; delay: number }) {
  return (
    <motion.g initial={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.25 } }}>
      <DrawnPath d={pointer.arrow} color={pointer.color} width={2.5} delay={delay + 0.1} moveDelay={delay} drawDuration={0.4} />
      {skin.pointerHeads && (
        <Arrowhead x={pointer.tipX} y={pointer.tipY} direction="down" color={pointer.color} length={skin.metrics.arrow} delay={delay + 0.45} moveDelay={delay} />
      )}
    </motion.g>
  );
}

interface CommitSlotProps {
  node: ListNode;
  skin: SceneSkin;
  isNew: boolean;
  birth: { x: number; y: number } | null;
  spotlight: number | null;
  children: ReactNode;
}

/** Positions a commit and animates it: born from its parent, gliding when history reshapes, glowing where HEAD is. */
function CommitSlot({ node, skin, isNew, birth, spotlight, children }: CommitSlotProps) {
  const { nodeW, nodeH } = skin.metrics;
  // Plain rgba so the glow can be interpolated smoothly.
  const glow = (alpha: number) => (node.conflicted ? `rgba(244, 63, 94, ${alpha})` : `rgba(249, 115, 22, ${alpha})`);
  const box = { width: nodeW, height: nodeH, left: -nodeW / 2, top: -nodeH / 2, borderRadius: skin.glowRadius };

  return (
    <motion.div
      className="absolute left-0 top-0 z-10"
      initial={birth ? { x: birth.x, y: birth.y, opacity: 0, scale: 0.55 } : { x: node.x, y: node.y, opacity: 0, scale: 0.92 }}
      animate={{ x: node.x, y: node.y, opacity: node.reachable ? 1 : 0.45, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.3 } }}
      transition={isNew ? { duration: 0.7, ease: POP, opacity: { duration: 0.25 } } : GLIDE}
    >
      {(node.isHead || node.conflicted) && (
        <motion.span
          className="pointer-events-none absolute"
          style={box}
          animate={{ boxShadow: [`0 0 0 0px ${glow(0.35)}`, `0 0 0 10px ${glow(0)}`] }}
          transition={{ duration: node.conflicted ? 1.1 : 2.4, repeat: Infinity, ease: "easeOut" }}
        />
      )}
      {spotlight !== null && (
        <motion.span
          key={spotlight}
          className="pointer-events-none absolute"
          style={box}
          initial={{ boxShadow: `0 0 0 0px ${glow(0.55)}`, backgroundColor: glow(0.14) }}
          animate={{ boxShadow: `0 0 0 26px ${glow(0)}`, backgroundColor: glow(0) }}
          transition={{ duration: 1.3, ease: [0.22, 1, 0.36, 1], delay: isNew ? 0.4 : 0.25 }}
        />
      )}
      {children}
    </motion.div>
  );
}

function PointerSlot({ pointer, delay, children }: { pointer: Pointer; delay: number; children: ReactNode }) {
  return (
    <motion.div
      className="pointer-events-none absolute left-0 top-0 z-20"
      initial={{ x: pointer.x, y: pointer.y, opacity: 0, scale: 0.4 }}
      animate={{ x: pointer.x, y: pointer.y, opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
      transition={{
        x: { ...GLIDE, delay },
        y: { ...GLIDE, delay },
        opacity: { duration: 0.25, delay },
        scale: { type: "spring", stiffness: 420, damping: 19, delay },
      }}
    >
      {children}
    </motion.div>
  );
}

/** A pill outside the scene's world (the empty state), laid out in normal flow. */
function StaticPill({ skin, pointer }: { skin: SceneSkin; pointer: Pointer }) {
  return (
    <span className="relative block" style={{ width: pointer.width, height: skin.metrics.pillH }}>
      <span className="absolute left-1/2 top-1/2">
        <skin.Pill pointer={pointer} />
      </span>
    </span>
  );
}

function staticPointer(skin: SceneSkin, kind: "head" | "branch", name: string): Pointer {
  const head = kind === "head";
  return {
    key: name,
    kind,
    name,
    x: 0,
    y: 0,
    width: head ? skin.metrics.headWidth : pillWidth(name, skin.metrics),
    color: head ? COLORS.head : branchColor(name),
    current: true,
    arrow: "",
    tipX: 0,
    tipY: 0,
    target: "",
  };
}

function EmptyScene({ skin, repo }: { skin: SceneSkin; repo: RepoState }) {
  const branch = repo.head.kind === "branch" ? repo.head.name : "main";
  const stem = (delay: number, color: string, dashed = false) => (
    <motion.span
      initial={{ scaleY: 0 }}
      animate={{ scaleY: 1 }}
      transition={{ delay }}
      className={dashed ? "h-8 w-0 origin-top border-l-[2.5px] border-dashed border-line-strong" : "h-7 w-[2.5px] origin-top"}
      style={dashed ? undefined : { background: color }}
    />
  );

  return (
    <div className="relative flex h-full items-center justify-center p-6">
      <div className="absolute inset-0">
        <skin.Backdrop />
      </div>
      <AnimatePresence mode="wait">
        {repo.initialized ? (
          <motion.div key="unborn" className="relative flex flex-col items-center" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <motion.span initial={{ scale: 0.4 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.1 }}>
              <StaticPill skin={skin} pointer={staticPointer(skin, "head", "HEAD")} />
            </motion.span>
            {stem(0.3, COLORS.head)}
            <motion.span initial={{ scale: 0.4 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.45 }}>
              <StaticPill skin={skin} pointer={staticPointer(skin, "branch", branch)} />
            </motion.span>
            {stem(0.65, "", true)}
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
              <skin.Placeholder />
            </motion.span>
          </motion.div>
        ) : (
          <motion.div key="no-repo" className="relative text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex h-[64px] w-[220px] items-center justify-center rounded-2xl border-[1.5px] border-dashed border-line-strong bg-surface text-[14px] text-ink-3">
              No repository yet
            </div>
            <div className="mt-3 text-[13px] text-ink-3">
              Start with <code className="rounded bg-surface-3 px-1.5 py-0.5 text-ink">git init</code>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
