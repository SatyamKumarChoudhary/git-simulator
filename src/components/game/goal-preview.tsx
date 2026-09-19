"use client";

import { Check } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { MINI_METRICS, layoutLinkedList } from "@/components/visualizer/linked-list/layout";
import { MiniList } from "@/components/visualizer/linked-list/mini-list";
import { MiniZones } from "@/components/visualizer/mini-zones";
import { buildZones } from "@/components/visualizer/zones-model";
import { type LevelDefinition, levelGoalState, levelStartState } from "@/content";
import { type RepoState, reachableCommits } from "@/engine";
import { cn } from "@/lib/utils";

type Side = "start" | "goal";

const SIDES: ReadonlyArray<{ id: Side; label: string }> = [
  { id: "start", label: "Start" },
  { id: "goal", label: "Goal" },
];

/** Delay before the preview plays its start → goal change on opening a level. */
const INTRO_DELAY = 1100;

/** What the history diagram shows: commits (and whether they're still reachable) and where every pointer points. */
function historyKey(state: RepoState): string {
  const layout = layoutLinkedList(state, MINI_METRICS);
  return JSON.stringify([layout.nodes.map((node) => [node.id, node.reachable]), layout.pointers.map((pointer) => [pointer.key, pointer.target])]);
}

/** The goal without the commits the solution leaves behind, so the picture shows only what you end up with. */
function withoutAbandoned(goal: RepoState, start: RepoState): RepoState {
  const before = reachableCommits(start);
  const after = reachableCommits(goal);
  return { ...goal, commits: Object.fromEntries(Object.entries(goal.commits).filter(([id]) => after.has(id) || !before.has(id))) };
}

function zoneKey(state: RepoState, zone: "work" | "stage"): string {
  return JSON.stringify(buildZones(state)[zone].map((card) => [card.path, card.status]));
}

/**
 * The level's question as a picture: the starting repository and the one you need to reach, with a switch that morphs
 * between them. Only the parts that actually change (history and/or files) are drawn. Mount with `key={level.id}`.
 */
export function GoalPreview({ level, done }: { level: LevelDefinition; done: boolean }) {
  const start = levelStartState(level);
  const goal = levelGoalState(level);
  const changes = useMemo(() => {
    const history = historyKey(start) !== historyKey(goal);
    const staging = zoneKey(start, "stage") !== zoneKey(goal, "stage");
    const working = zoneKey(start, "work") !== zoneKey(goal, "work");
    // File trays only when they tell something the history can't: the staging area, or file changes without new commits.
    return { history, files: staging || (working && !history) };
  }, [start, goal]);
  const goalPicture = useMemo(() => withoutAbandoned(goal, start), [goal, start]);
  const [side, setSide] = useState<Side>("start");

  useEffect(() => {
    const timer = setTimeout(() => setSide("goal"), INTRO_DELAY);
    return () => clearTimeout(timer);
  }, []);

  if (!changes.history && !changes.files) return null;
  const goalSide = side === "goal";

  return (
    <div className="shrink-0 overflow-hidden rounded-xl border border-line">
      <div className="flex items-center justify-between gap-2 border-b border-line bg-surface px-3 py-1.5">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={done ? "done" : side}
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -3 }}
            transition={{ duration: 0.15 }}
            className={cn("flex items-center gap-1.5 text-[12px] font-medium", done ? "text-emerald-700 dark:text-emerald-300" : "text-ink-2")}
          >
            {done ? (
              <>
                <Check className="size-3.5" strokeWidth={3} /> Goal reached
              </>
            ) : goalSide ? (
              "Make it look like this"
            ) : (
              "Where you start"
            )}
          </motion.span>
        </AnimatePresence>

        <div className="flex rounded-lg bg-surface-3 p-0.5" role="group" aria-label="Preview">
          {SIDES.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setSide(id)}
              aria-pressed={side === id}
              className={cn("relative rounded-md px-2.5 py-0.5 text-[11px] font-medium transition-colors", side === id ? "text-ink" : "text-ink-3 hover:text-ink-2")}
            >
              {side === id && (
                <motion.span
                  layoutId="goal-preview-side"
                  className="absolute inset-0 rounded-md bg-surface shadow-[0_1px_2px_rgb(15_23_42_/_0.15)]"
                  transition={{ type: "spring", stiffness: 500, damping: 36 }}
                />
              )}
              <span className="relative z-10">{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div
        className="space-y-2 bg-canvas p-2.5"
        style={{ backgroundImage: "radial-gradient(var(--c-canvas-dot) 1px, transparent 1px)", backgroundSize: "18px 18px" }}
      >
        {changes.history && <MiniList repo={goalSide ? goalPicture : start} baseline={goalSide ? start : undefined} />}
        {changes.files && <MiniZones repo={goalSide ? goal : start} />}
      </div>
    </div>
  );
}
