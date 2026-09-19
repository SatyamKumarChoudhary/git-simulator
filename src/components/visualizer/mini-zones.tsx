"use client";

import { AnimatePresence, motion } from "motion/react";
import { useMemo } from "react";
import type { RepoState } from "@/engine";
import { cn } from "@/lib/utils";
import { STATUS_BADGE, STATUS_STYLE, ZONE_NAMES, type ZoneId, buildZones } from "./zones-model";

const ZONES: ZoneId[] = ["work", "stage", "repo"];
const SHORT_NAMES: Record<ZoneId, string> = { work: "Working", stage: "Staging", repo: "Repository" };
const MAX_CARDS = 4;

/** Compact working directory / staging area / repository trays for small previews. */
export function MiniZones({ repo }: { repo: RepoState }) {
  const zones = useMemo(() => buildZones(repo), [repo]);

  return (
    <div className="grid grid-cols-3 gap-1.5">
      {ZONES.map((zone) => {
        const cards = zones[zone];
        return (
          <div key={zone} title={ZONE_NAMES[zone]} className="min-w-0 rounded-lg border border-dashed border-line-strong p-1.5">
            <div className="mb-1 truncate px-0.5 text-[10px] font-medium text-ink-3">{SHORT_NAMES[zone]}</div>
            <div className="flex flex-col gap-1">
              <AnimatePresence initial={false} mode="popLayout">
                {cards.slice(0, MAX_CARDS).map((card) => {
                  const badge = STATUS_BADGE[card.status];
                  const style = STATUS_STYLE[card.status];
                  return (
                    <motion.div
                      key={card.path}
                      layout
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                      className="flex h-[22px] items-center gap-1 rounded-md border border-[var(--c-node-border)] bg-[var(--c-node)] px-1.5 font-mono text-[10px] shadow-[0_1px_2px_rgb(15_23_42_/_0.08)]"
                    >
                      <span className={cn("min-w-0 flex-1 truncate", card.status === "ignored" ? "text-ink-3" : "text-ink", style.strike && "line-through")}>
                        {card.path}
                      </span>
                      {badge && card.status !== "ignored" && (
                        <span className="font-bold" style={{ color: `color-mix(in srgb, ${style.color} 78%, var(--c-ink))` }}>
                          {badge}
                        </span>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              {cards.length > MAX_CARDS && <div className="px-0.5 text-[10px] text-ink-3">+{cards.length - MAX_CARDS} more</div>}
              {cards.length === 0 && <div className="px-0.5 py-0.5 text-[10px] text-ink-4">empty</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
