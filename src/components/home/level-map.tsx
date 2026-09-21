"use client";

import { Check, Lock, Star, Trophy } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { type LevelEntry, type TopicDefinition, levelEntries, topicLevels, topics } from "@/content";
import { completedCount, currentEntry, isUnlocked } from "@/lib/progression";
import { worldTheme } from "@/lib/theme";
import { useHydrated } from "@/lib/use-hydrated";
import { cn } from "@/lib/utils";
import { type LevelRecord, useProgress } from "@/store/progress-store";

/** Levels snake across the board: left → right, then right → left on the next row. */
const ROW = 164;
/** Diameter of a level coin, how thick its edge looks, and how thick the road is. */
const COIN = 70;
const DEPTH = 9;
const ROAD = 16;
const ROAD_EDGE = 7;

type NodeState = "done" | "current" | "locked";

const shade = (color: string, percent: number) => `color-mix(in srgb, ${color} ${100 - percent}%, #000)`;
const tint = (color: string, percent: number) => `color-mix(in srgb, ${color} ${100 - percent}%, #fff)`;

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(640);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth);
    measure();
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return { ref, width };
}

export function LevelMap() {
  const hydrated = useHydrated();
  const records = useProgress((s) => s.levels);
  const progress: Record<string, LevelRecord> = hydrated ? records : {};
  const current = currentEntry(progress);
  const done = completedCount(progress);

  // Returning players land on the level they're up to.
  useEffect(() => {
    if (!hydrated || done === 0) return;
    document.querySelector("[data-current-level]")?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [hydrated, done]);

  return (
    <div className="mx-auto w-full max-w-3xl">
      {topics.map((world, unitIndex) => (
        <Unit key={world.id} world={world} number={unitIndex + 1} progress={progress} currentId={current.level.id} />
      ))}

      {hydrated && done > 0 && <ResetProgress />}
    </div>
  );
}

/** A rounded U-turn at the end of a row, or a straight run along it. */
function roadSegment(from: { x: number; y: number }, to: { x: number; y: number }, width: number, slot: number): string {
  if (Math.abs(from.y - to.y) < 1) return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
  const outward = from.x > width / 2 ? 1 : -1;
  // Keep the U-turn inside the board.
  const reach = slot * 0.42;
  const bulge = from.x + outward * reach;
  return `M ${from.x} ${from.y} C ${bulge} ${from.y}, ${bulge} ${to.y}, ${to.x} ${to.y}`;
}

function Unit({ world, number, progress, currentId }: { world: TopicDefinition; number: number; progress: Record<string, LevelRecord>; currentId: string }) {
  const entries = topicLevels(world.id).map((entry) => entry);
  const color = worldTheme[world.theme].hex;
  const unlocked = isUnlocked(entries[0].level.id, progress);
  const done = entries.filter((entry) => progress[entry.level.id]).length;
  const { ref, width } = useWidth<HTMLDivElement>();

  const columns = width < 430 ? 2 : 3;
  const rows = Math.ceil(entries.length / columns);
  const step = width / columns;
  const points = entries.map((_, i) => {
    const row = Math.floor(i / columns);
    const inRow = i % columns;
    const column = row % 2 === 0 ? inRow : columns - 1 - inRow;
    return { x: step * (column + 0.5), y: row * ROW + ROW / 2 };
  });
  const height = rows * ROW;
  const stateOf = (entry: LevelEntry): NodeState => (progress[entry.level.id] ? "done" : entry.level.id === currentId && isUnlocked(entry.level.id, progress) ? "current" : "locked");

  return (
    <section className="relative pb-14">
      {unlocked && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-[-10%] top-10 bottom-0 -z-10"
          style={{ background: `radial-gradient(60% 45% at 50% 35%, color-mix(in srgb, ${color} 16%, transparent), transparent 75%)` }}
        />
      )}
      <UnitBanner world={world} number={number} unlocked={unlocked} done={done} total={entries.length} color={color} />

      <div ref={ref} className="relative mt-8" style={{ height }}>
        <svg className="pointer-events-none absolute inset-0 overflow-visible" width={width} height={height}>
          {points.slice(1).map((point, i) => {
            const d = roadSegment(points[i], point, width, step);
            const lit = Boolean(progress[entries[i].level.id]);
            return (
              <g key={entries[i + 1].level.id}>
                {/* The road's thickness, then its surface, then a dashed centre line. */}
                <path d={d} fill="none" stroke={lit ? shade(color, 45) : "var(--c-line)"} strokeWidth={ROAD} strokeLinecap="round" transform={`translate(0 ${ROAD_EDGE})`} />
                <path d={d} fill="none" stroke={lit ? shade(color, 8) : "var(--c-line-strong)"} strokeWidth={ROAD} strokeLinecap="round" />
                {lit && (
                  <motion.path
                    d={d}
                    fill="none"
                    stroke={tint(color, 35)}
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeDasharray="2 14"
                    initial={{ pathLength: 0 }}
                    whileInView={{ pathLength: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.7, delay: 0.06 * i, ease: [0.33, 1, 0.68, 1] }}
                  />
                )}
              </g>
            );
          })}
        </svg>
        {entries.map((entry, i) => (
          <LevelNode key={entry.level.id} entry={entry} x={points[i].x} y={points[i].y} state={stateOf(entry)} record={progress[entry.level.id]} slot={step} color={color} />
        ))}
      </div>
    </section>
  );
}

/** A raised, colourful banner per unit, with how far you've got. */
function UnitBanner({ world, number, unlocked, done, total, color }: { world: TopicDefinition; number: number; unlocked: boolean; done: number; total: number; color: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      className={cn("relative overflow-hidden rounded-3xl px-5 py-4", unlocked ? "text-white" : "border border-line bg-surface-2 text-ink-3")}
      style={
        unlocked
          ? {
              background: `linear-gradient(135deg, ${shade(color, 18)}, ${shade(color, 42)})`,
              boxShadow: `0 6px 0 ${shade(color, 55)}, 0 22px 34px -20px ${shade(color, 30)}`,
              textShadow: "0 1px 1px rgb(0 0 0 / 0.18)",
            }
          : { boxShadow: "0 6px 0 var(--c-line)" }
      }
    >
      {unlocked && (
        <>
          <span className="pointer-events-none absolute -right-10 -top-14 size-40 rounded-full bg-white/10" />
          <span className="pointer-events-none absolute -bottom-16 right-16 size-28 rounded-full bg-white/5" />
        </>
      )}
      <div className="relative flex items-center gap-4">
        <span
          className={cn(
            "grid size-12 shrink-0 place-items-center rounded-2xl text-2xl",
            unlocked ? "bg-white/20 shadow-[inset_0_2px_0_rgb(255_255_255_/_0.3)]" : "bg-surface-3 grayscale",
          )}
        >
          {world.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <div className={cn("text-[11px] font-bold uppercase tracking-widest", unlocked ? "text-white/75" : "text-ink-4")}>Unit {number}</div>
          <div className={cn("font-display text-xl font-semibold leading-tight", !unlocked && "text-ink-2")}>{world.title}</div>
          <div className={cn("truncate text-[12.5px]", unlocked ? "text-white/85" : "text-ink-3")}>{world.tagline}</div>
        </div>
        <div className="shrink-0">
          {unlocked ? (
            <span className="rounded-full bg-white/20 px-2.5 py-1 text-[13px] font-bold tabular-nums">
              {done}/{total}
            </span>
          ) : (
            <Lock className="size-5 text-ink-4" />
          )}
        </div>
      </div>
      {unlocked && (
        <div className="relative mt-3.5 h-2 overflow-hidden rounded-full bg-black/20">
          <motion.div
            className="h-full rounded-full bg-white"
            initial={{ width: 0 }}
            whileInView={{ width: `${(done / total) * 100}%` }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.33, 1, 0.68, 1] }}
          />
        </div>
      )}
    </motion.div>
  );
}

/** A glossy 3D coin: a coloured face on top of a darker edge, pressing down when clicked. */
function Coin({ state, color, children }: { state: NodeState; color: string; children: ReactNode }) {
  const locked = state === "locked";
  return (
    <span className="group/coin relative block" style={{ width: COIN, height: COIN + DEPTH }}>
      <span
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 rounded-[50%] bg-slate-900/20 blur-[5px] dark:bg-black/60"
        style={{ bottom: -7, width: COIN * 0.78, height: 12 }}
      />
      <span
        className={cn("absolute inset-x-0 bottom-0 rounded-full", locked && "bg-[#bcc4d1] dark:bg-[#111215]")}
        style={{ height: COIN, background: locked ? undefined : shade(color, 35) }}
      />
      <span
        className={cn(
          "absolute inset-x-0 top-0 grid place-items-center overflow-hidden rounded-full transition-[translate] duration-150 ease-out group-hover/coin:-translate-y-1 group-active/coin:translate-y-1.5",
          locked && "bg-[radial-gradient(circle_at_35%_28%,#ffffff,#e4e9f1_58%,#d3dae5)] dark:bg-[radial-gradient(circle_at_35%_28%,#4a4d56,#34373e_58%,#2a2c32)]",
        )}
        style={{
          height: COIN,
          background: locked ? undefined : `radial-gradient(circle at 35% 28%, ${tint(color, 45)}, ${color} 55%, ${shade(color, 14)})`,
          boxShadow: "inset 0 3px 0 rgb(255 255 255 / 0.35), inset 0 -4px 0 rgb(0 0 0 / 0.1)",
        }}
      >
        <span className="pointer-events-none absolute left-[20%] top-[11%] h-[17%] w-[36%] -rotate-12 rounded-full bg-white/50 blur-[1.5px]" />
        <span className="relative">{children}</span>
      </span>
    </span>
  );
}

interface LevelNodeProps {
  entry: LevelEntry;
  x: number;
  y: number;
  state: NodeState;
  record?: LevelRecord;
  /** Width of this level's slot on the board, so names never collide. */
  slot: number;
  color: string;
}

function LevelNode({ entry, x, y, state, record, slot, color }: LevelNodeProps) {
  const [nudge, setNudge] = useState(0);
  const previous = levelEntries[entry.index - 1];
  const locked = state === "locked";
  const checkpoint = entry.level.phase === "checkpoint";

  const coin = (
    <Coin state={state} color={color}>
      {state === "done" ? (
        <Check className="size-7 text-white drop-shadow-[0_1px_1px_rgb(0_0_0_/_0.3)]" strokeWidth={3.5} />
      ) : locked ? (
        <Lock className="size-6 text-slate-400 dark:text-slate-500" strokeWidth={2.5} />
      ) : (
        <span className="font-display text-2xl font-bold text-white [text-shadow:0_2px_2px_rgb(0_0_0_/_0.25)]">{entry.index + 1}</span>
      )}
    </Coin>
  );

  return (
    <div className="absolute size-0" style={{ left: x, top: y }} data-current-level={state === "current" || undefined}>
      <motion.div
        key={nudge}
        className="absolute"
        style={{ left: -COIN / 2, top: -COIN / 2 }}
        animate={nudge ? { x: [0, -7, 7, -5, 5, 0] } : undefined}
        transition={{ duration: 0.4 }}
      >
        {state === "current" && (
          <>
            <motion.span
              className="pointer-events-none absolute left-0 top-0 rounded-full border-[3px]"
              style={{ width: COIN, height: COIN, borderColor: color }}
              animate={{ scale: [1, 1.35], opacity: [0.7, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
            />
            <motion.span
              className="absolute -top-10 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-xl border-2 bg-surface px-3 py-1 text-[12px] font-extrabold tracking-wide"
              style={{ borderColor: color, color: shade(color, 30), boxShadow: `0 3px 0 ${shade(color, 20)}` }}
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
            >
              {entry.index === 0 ? "START" : "NEXT"}
            </motion.span>
          </>
        )}
        {checkpoint && (
          <span
            className="pointer-events-none absolute -right-1.5 -top-1.5 z-10 grid size-6 place-items-center rounded-full text-white shadow-[0_2px_4px_-1px_rgb(0_0_0_/_0.4)]"
            style={{ background: locked ? "var(--c-ink-4)" : shade(color, 25) }}
            title="Checkpoint"
          >
            <Trophy className="size-3.5" strokeWidth={2.6} aria-hidden />
          </span>
        )}
        {locked ? (
          <button type="button" onClick={() => setNudge((n) => n + 1)} aria-label={`${entry.level.title} (locked)`} className="block">
            {coin}
          </button>
        ) : (
          <Link href={`/play/${entry.level.id}`} aria-label={entry.level.title} className="block">
            {coin}
          </Link>
        )}
      </motion.div>

      <div className="absolute left-1/2 -translate-x-1/2 text-center" style={{ top: COIN / 2 + DEPTH + 6, width: slot - 18 }}>
        <div className={cn("text-balance text-[13px] font-semibold leading-snug", locked ? "text-ink-4" : "text-ink")}>{entry.level.title}</div>
        {record && (
          <div className="mt-1 flex justify-center gap-0.5">
            {[1, 2, 3].map((n) => (
              <Star key={n} className={cn("size-3.5", n <= record.stars ? "fill-amber-400 text-amber-400" : "text-ink-4")} />
            ))}
          </div>
        )}
        <AnimatePresence>
          {locked && nudge > 0 && previous && (
            <motion.div key={nudge} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="mt-1 text-[11px] text-amber-700 dark:text-amber-200/80">
              Finish “{previous.level.title}” first
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ResetProgress() {
  const reset = useProgress((s) => s.resetProgress);
  const [armed, setArmed] = useState(false);
  return (
    <div className="text-center">
      <button
        type="button"
        onClick={() => (armed ? (reset(), setArmed(false)) : setArmed(true))}
        onBlur={() => setArmed(false)}
        className="text-[12px] text-ink-4 transition-colors hover:text-ink-2"
      >
        {armed ? "Click again to erase all progress" : "Reset progress"}
      </button>
    </div>
  );
}
