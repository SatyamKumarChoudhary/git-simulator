"use client";

import { Check } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { HelpToggle } from "@/components/ui/help-button";
import { type LevelPhase, findLevel, levelSolution } from "@/content";
import { cn } from "@/lib/utils";
import { useGame } from "@/store/game-store";
import { GoalPreview } from "./goal-preview";

export function MissionPanel({ className }: { className?: string }) {
  const level = useGame((s) => s.level)!;
  const achieved = useGame((s) => s.achieved);
  const hintsShown = useGame((s) => s.hintsShown);
  const solutionShown = useGame((s) => s.solutionShown);
  const revealHint = useGame((s) => s.revealHint);
  const revealSolution = useGame((s) => s.revealSolution);
  const insertCommand = useGame((s) => s.insertCommand);
  const [helpOpen, setHelpOpen] = useState(false);
  const entry = findLevel(level.id)!;
  const done = level.goals.every((goal) => achieved.includes(goal.id));

  return (
    <section className={cn("panel thin-scroll flex min-h-0 flex-col gap-4 overflow-y-auto rounded-2xl p-5", className)}>
      <div>
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-[11px] text-ink-3">
              {entry.world.title} · {entry.number} of {entry.world.levels.length}
            </span>
            <PhaseBadge phase={level.phase ?? "learn"} />
          </div>
          <HelpToggle label="Show help and hints" open={helpOpen} onClick={() => setHelpOpen((open) => !open)} />
        </div>
        <h1 className="mt-1 font-display text-xl font-semibold text-ink">{level.title}</h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2">{level.mission}</p>
      </div>

      <GoalPreview key={level.id} level={level} done={done} />

      <AnimatePresence initial={false}>
        {helpOpen && (
          <motion.div
            key="help"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="space-y-3 rounded-xl bg-surface-2 p-3.5 text-[13px] leading-relaxed">
              <p className="text-ink-2">
                <span className="font-medium text-ink">{level.concept.title}.</span> {level.concept.body}
              </p>

              <AnimatePresence initial={false}>
                {level.hints.slice(0, hintsShown).map((hint, i) => (
                  <motion.p
                    key={hint}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border-l-2 border-amber-300/50 pl-3 text-ink-2"
                  >
                    <span className="text-amber-700 dark:text-amber-200">Hint {i + 1}.</span> {hint}
                  </motion.p>
                ))}
              </AnimatePresence>

              {solutionShown && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-1 border-l-2 border-violet-400/50 pl-3">
                  {levelSolution(level).map((command, i) => (
                    <button
                      key={`${command}-${i}`}
                      type="button"
                      onClick={() => insertCommand(command)}
                      className="block font-mono text-[12px] text-ink hover:text-ink"
                    >
                      $ {command}
                    </button>
                  ))}
                </motion.div>
              )}

              {hintsShown < level.hints.length ? (
                <button type="button" onClick={revealHint} className="text-[12px] text-amber-700 dark:text-amber-200/80 transition-colors hover:text-amber-700 dark:hover:text-amber-100">
                  {hintsShown === 0 ? "Show a hint" : "Show another hint"}
                </button>
              ) : (
                !solutionShown && (
                  <button type="button" onClick={revealSolution} className="text-[12px] text-violet-600 dark:text-violet-300/80 transition-colors hover:text-violet-600 dark:hover:text-violet-200">
                    Show the solution
                  </button>
                )
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ul className="space-y-2.5">
        {level.goals.map((goal) => {
          const met = achieved.includes(goal.id);
          return (
            <li key={goal.id} className="flex items-start gap-2.5 text-[13px]">
              <motion.span
                className={cn(
                  "mt-px grid size-[18px] shrink-0 place-items-center rounded-full border transition-colors duration-300",
                  met ? "border-emerald-400 bg-emerald-400" : "border-line-strong",
                )}
                animate={met ? { scale: [1, 1.35, 1] } : { scale: 1 }}
                transition={{ duration: 0.4 }}
              >
                <AnimatePresence>
                  {met && (
                    <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: "spring", stiffness: 500, damping: 20 }}>
                      <Check className="size-3 text-[#0b0d17]" strokeWidth={4} />
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.span>
              <span className={cn("transition-colors duration-300", met ? "text-ink-3" : "text-ink")}>{goal.label}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Says what kind of level this is, so the learning path is visible: a new idea, practice, or a mixed checkpoint. */
function PhaseBadge({ phase }: { phase: LevelPhase }) {
  if (phase === "learn") return null;
  const practice = phase === "practice";
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
        practice ? "bg-sky-500/15 text-sky-700 dark:text-sky-300" : "bg-amber-500/15 text-amber-700 dark:text-amber-300",
      )}
    >
      {practice ? "Practice" : "Checkpoint"}
    </span>
  );
}
