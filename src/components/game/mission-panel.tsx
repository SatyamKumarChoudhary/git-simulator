"use client";

import { Check } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { HelpToggle } from "@/components/ui/help-button";
import { type LevelDefinition, findLevel, levelSolution } from "@/content";
import { cn } from "@/lib/utils";
import { useGame } from "@/store/game-store";

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

  return (
    <section className={cn("panel thin-scroll flex min-h-0 flex-col gap-4 overflow-y-auto rounded-2xl p-5", className)}>
      <div>
        <div className="flex items-center justify-between gap-3">
          <span className="truncate text-[11px] text-ink-3">
            {entry.topic.title} · {entry.number} of {entry.topic.levels.length}
          </span>
          <HelpToggle label="Show help and hints" open={helpOpen} onClick={() => setHelpOpen((open) => !open)} />
        </div>
        <h1 className="mt-1 font-display text-xl font-semibold text-ink">{level.title}</h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2">{level.mission}</p>
      </div>

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

      <Steps goals={level.goals} achieved={achieved} />
    </section>
  );
}

/** What the level asks for, as a numbered list you can watch tick off. The step you're on is the one picked out. */
function Steps({ goals, achieved }: { goals: LevelDefinition["goals"]; achieved: string[] }) {
  const done = goals.filter((goal) => achieved.includes(goal.id)).length;
  const next = goals.findIndex((goal) => !achieved.includes(goal.id));

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.09em] text-ink-3">Steps</h2>
        <span className="text-[11px] tabular-nums text-ink-3">
          {done} of {goals.length}
        </span>
        <span className="ml-auto h-1.5 w-20 overflow-hidden rounded-full bg-surface-3">
          <motion.span
            className="block h-full rounded-full bg-emerald-400"
            initial={false}
            animate={{ width: `${(done / goals.length) * 100}%` }}
            transition={{ type: "spring", stiffness: 220, damping: 28 }}
          />
        </span>
      </div>

      <ol className="space-y-1">
        {goals.map((goal, index) => {
          const met = achieved.includes(goal.id);
          const current = index === next;
          return (
            <li
              key={goal.id}
              className={cn(
                "flex items-start gap-2.5 rounded-xl px-2 py-1.5 text-[13px] transition-colors duration-300",
                current ? "bg-surface-2" : "bg-transparent",
              )}
            >
              <motion.span
                className={cn(
                  "mt-px grid size-[20px] shrink-0 place-items-center rounded-full border text-[11px] font-semibold tabular-nums transition-colors duration-300",
                  met
                    ? "border-emerald-400 bg-emerald-400 text-[#0b0d17]"
                    : current
                      ? "border-sky-400 text-sky-600 dark:text-sky-300"
                      : "border-line-strong text-ink-3",
                )}
                animate={met ? { scale: [1, 1.35, 1] } : { scale: 1 }}
                transition={{ duration: 0.4 }}
              >
                <AnimatePresence mode="wait" initial={false}>
                  {met ? (
                    <motion.span key="done" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: "spring", stiffness: 500, damping: 20 }}>
                      <Check className="size-3" strokeWidth={4} />
                    </motion.span>
                  ) : (
                    <motion.span key="number" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      {index + 1}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.span>
              <span className={cn("transition-colors duration-300", met ? "text-ink-3 line-through decoration-ink-3/40" : current ? "text-ink" : "text-ink-2")}>
                {goal.label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
