"use client";

import { ArrowRight, Database, FileText, FolderOpen, Layers, type LucideIcon } from "lucide-react";
import { AnimatePresence, animate, motion } from "motion/react";
import { type ReactNode, useMemo, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { HelpPopover } from "@/components/ui/help-button";
import type { EngineEvent, RepoState } from "@/engine";
import { cn } from "@/lib/utils";
import { type LaunchFlight, type Rect, useZoneFlights } from "./use-zone-flights";
import { type FileCardModel, STATUS_BADGE, STATUS_STYLE, ZONE_NAMES, type ZoneId, buildZones, cardKey } from "./zones-model";

/** Every zone is its own tinted surface, so you can tell at a glance where a file is. */
const ZONE_LOOK: Record<ZoneId, { color: string; hint: string; Icon: LucideIcon }> = {
  work: { color: "#f59e0b", hint: "your files", Icon: FolderOpen },
  stage: { color: "#0ea5e9", hint: "next commit", Icon: Layers },
  repo: { color: "#8b5cf6", hint: "saved history", Icon: Database },
};

/** Flight choreography, in seconds: peel off the surface, arc across, touch down. */
const LIFT = 0.2;
const TRAVEL = 0.6;
const STAGGER = 0.09;
const touchdown = (index: number) => index * STAGGER + LIFT + TRAVEL;

// Same shape in both, so the shadow grows and shrinks smoothly as a card lifts and lands.
const RESTING_SHADOW = "0px 1px 0px 0px rgba(15, 23, 42, 0.06), 0px 2px 6px -2px rgba(15, 23, 42, 0.18)";
const RAISED_SHADOW = "0px 6px 0px -4px rgba(15, 23, 42, 0.06), 0px 24px 34px -12px rgba(15, 23, 42, 0.45)";

/** A material ripple spreading from the middle of the spot where a card landed. */
function ripple(container: HTMLElement, at: Rect, color: string) {
  const clip = document.createElement("div");
  clip.className = "pointer-events-none absolute z-30 overflow-hidden rounded-xl";
  Object.assign(clip.style, { left: `${at.left}px`, top: `${at.top}px`, width: `${at.width}px`, height: `${at.height}px` });
  const size = Math.max(at.width, at.height) * 2.2;
  const wave = document.createElement("div");
  wave.className = "absolute rounded-full";
  Object.assign(wave.style, { width: `${size}px`, height: `${size}px`, left: `${(at.width - size) / 2}px`, top: `${(at.height - size) / 2}px`, background: color });
  clip.appendChild(wave);
  container.appendChild(clip);
  void animate(wave, { scale: [0, 1], opacity: [0.35, 0] }, { duration: 0.65, ease: "easeOut" }).then(() => clip.remove());
}

/**
 * A copy of the landing card lifts off where the file was (rising, tipping toward you, its shadow spreading),
 * flies across in an arc, and settles into place with a small bounce and a ripple.
 */
const launchFlight: LaunchFlight = (container, { flight, from, to, target, index, source }) => {
  const landingZone = ZONE_LOOK[flight.to.split(":")[0] as ZoneId];
  const ghost = target.cloneNode(true) as HTMLElement;
  ghost.setAttribute("aria-hidden", "true");
  ghost.tabIndex = -1;
  ghost.classList.add("pointer-events-none", "absolute", "z-40");
  Object.assign(ghost.style, {
    left: `${from.left}px`,
    top: `${from.top}px`,
    width: `${from.width}px`,
    height: `${from.height}px`,
    margin: "0",
    opacity: "1",
    transform: "none",
    boxShadow: RESTING_SHADOW,
  });
  if (source) {
    // git add copies: label the flying card, and let the file that stays behind glow for a moment.
    const tag = document.createElement("span");
    tag.textContent = "copy";
    tag.className = "absolute -top-2.5 right-3 rounded-full px-1.5 font-sans text-[10px] font-bold leading-4 text-white shadow-md";
    tag.style.background = landingZone.color;
    ghost.appendChild(tag);
    const glow = (spread: number, alpha: string) => `${RESTING_SHADOW}, 0px 0px 0px ${spread}px ${landingZone.color}${alpha}`;
    void animate(source, { boxShadow: [glow(0, "00"), glow(4, "55"), glow(0, "00")] }, { duration: 0.9, delay: index * STAGGER }).then(() => {
      source.style.boxShadow = "";
    });
  }
  container.appendChild(ghost);

  const dx = to.left - from.left;
  const dy = to.top - from.top;
  const tilt = dx >= 0 ? -4 : 4;
  const lift = -10;
  const peak = Math.min(0, dy) - 38;

  void (async () => {
    await animate(
      ghost,
      { transformPerspective: [700, 700], y: lift, scale: 1.08, rotate: tilt, rotateX: 12, boxShadow: RAISED_SHADOW },
      { duration: LIFT, delay: index * STAGGER, ease: [0.2, 0, 0, 1] },
    );
    await animate(
      ghost,
      { x: dx, y: [lift, peak, dy + lift], rotate: -tilt / 2 },
      {
        x: { duration: TRAVEL, ease: [0.45, 0, 0.3, 1] },
        y: { duration: TRAVEL, ease: ["easeOut", "easeIn"], times: [0, 0.42, 1] },
        rotate: { duration: TRAVEL, ease: "easeInOut" },
      },
    );
    ripple(container, to, flight.color);
    await animate(
      ghost,
      { y: dy, scale: 1, rotate: 0, rotateX: 0, boxShadow: RESTING_SHADOW },
      {
        y: { type: "spring", stiffness: 600, damping: 22 },
        scale: { type: "spring", stiffness: 600, damping: 16 },
        rotate: { type: "spring", stiffness: 420, damping: 20 },
        rotateX: { duration: 0.25, ease: "easeOut" },
        boxShadow: { duration: 0.3, ease: "easeOut" },
      },
    );
    await animate(ghost, { opacity: 0 }, { duration: 0.12 });
    ghost.remove();
  })();
};

export function CleanZones({ repo, pulse }: { repo: RepoState; pulse: { id: number; events: EngineEvent[] } }) {
  const zones = useMemo(() => buildZones(repo), [repo]);
  const { containerRef, registerCard, landing } = useZoneFlights(zones, launchFlight);
  const [peek, setPeek] = useState<FileCardModel | null>(null);

  const staged = pulse.events.some((event) => event.type === "staged");
  const committed = pulse.events.some((event) => event.type === "commit");

  const cards = (list: FileCardModel[]) => (
    <AnimatePresence mode="popLayout" initial={false}>
      {list.map((card) => {
        const key = cardKey(card);
        const landingIndex = landing.get(key);
        return (
          <FileCard
            key={key}
            ref={registerCard(key)}
            card={card}
            // A landing card stays hidden under the flying copy until it has touched down.
            appearDelay={landingIndex === undefined ? 0 : touchdown(landingIndex) + 0.22}
            onOpen={() => setPeek(card)}
          />
        );
      })}
    </AnimatePresence>
  );

  return (
    <>
      <div ref={containerRef} className="relative grid h-full grid-cols-1 gap-2.5 sm:grid-cols-[1fr_auto_1fr_auto_1fr]">
        <Zone zone="work" count={zones.work.length} empty="empty folder">
          {cards(zones.work)}
        </Zone>
        <Connector label="git add" to="stage" active={staged} pulseId={pulse.id} explanation={ADD_EXPLAINED} />
        <Zone zone="stage" count={zones.stage.length} empty={repo.initialized ? "nothing staged" : "run git init"}>
          {cards(zones.stage)}
        </Zone>
        <Connector label="git commit" to="repo" active={committed} pulseId={pulse.id} explanation={COMMIT_EXPLAINED} />
        <Zone zone="repo" count={zones.repo.length} empty={repo.initialized ? "no commits yet" : "run git init"}>
          {cards(zones.repo)}
        </Zone>
      </div>

      <Dialog open={peek !== null} onClose={() => setPeek(null)} title={peek && <span className="font-mono text-base">{peek.path}</span>}>
        {peek && (
          <div className="space-y-3 p-5">
            <p className="text-sm text-ink-3">
              <span className="text-ink">{ZONE_NAMES[peek.zone]}</span> ·{" "}
              {peek.alsoStaged ? ALSO_STAGED : peek.superseded ? SUPERSEDED : STATUS_STYLE[peek.status].description}
            </p>
            <pre className="thin-scroll max-h-72 overflow-auto rounded-lg border border-line bg-surface p-4 font-mono text-xs leading-relaxed text-ink">
              {peek.content === null ? "(deleted)" : peek.content === "" ? "(empty file)" : peek.content}
            </pre>
          </div>
        )}
      </Dialog>
    </>
  );
}

interface FileCardProps {
  card: FileCardModel;
  appearDelay: number;
  onOpen: () => void;
  ref: (el: HTMLElement | null) => void;
}

/** Why a file shows up in more than one zone: each zone holds its own copy. */
const ALSO_STAGED = "Your file on disk. This exact version was also copied into the staging area for the next commit — you can keep working on it.";
const SUPERSEDED = "The version saved in the last commit. The staging area holds a newer version that the next commit will save.";

function FileCard({ card, appearDelay, onOpen, ref }: FileCardProps) {
  const badge = STATUS_BADGE[card.status];
  const style = STATUS_STYLE[card.status];
  const ignored = card.status === "ignored";
  const stagedColor = ZONE_LOOK.stage.color;
  return (
    <motion.button
      ref={ref}
      layout
      type="button"
      onClick={onOpen}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { delay: appearDelay, duration: appearDelay ? 0.01 : 0.2 } }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      title={card.alsoStaged ? ALSO_STAGED : card.superseded ? SUPERSEDED : style.description}
      className="flex h-9 w-full shrink-0 items-center gap-2 rounded-xl border border-[var(--c-node-border)] bg-[var(--c-node)] px-2.5 text-left font-mono text-[13px] shadow-[0px_1px_0px_0px_rgba(15,23,42,0.06),0px_2px_6px_-2px_rgba(15,23,42,0.18)] transition-[translate,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-ink-4 hover:shadow-[0px_2px_0px_0px_rgba(15,23,42,0.05),0px_12px_20px_-10px_rgba(15,23,42,0.4)]"
    >
      <FileText className="size-3.5 shrink-0" style={{ color: `color-mix(in srgb, ${ZONE_LOOK[card.zone].color} 75%, var(--c-ink))` }} aria-hidden />
      <span className={cn("min-w-0 flex-1 truncate", badge && !ignored ? "text-ink" : "text-ink-2", ignored && "text-ink-3", style.strike && "line-through")}>
        {card.path}
      </span>
      {badge && (
        <span
          className="rounded-md px-1.5 text-[10.5px] font-bold leading-[18px]"
          style={
            ignored
              ? { color: "var(--c-ink-4)" }
              : { color: `color-mix(in srgb, ${style.color} 80%, var(--c-ink))`, background: `color-mix(in srgb, ${style.color} 16%, transparent)` }
          }
        >
          {badge}
        </span>
      )}
      {!badge && card.alsoStaged && (
        <span
          className="rounded-md px-1.5 font-sans text-[10.5px] font-bold leading-[18px]"
          style={{ color: `color-mix(in srgb, ${stagedColor} 80%, var(--c-ink))`, background: `color-mix(in srgb, ${stagedColor} 16%, transparent)` }}
        >
          ✓ staged
        </span>
      )}
      {card.superseded && <span className="font-sans text-[10.5px] font-semibold text-ink-4">older</span>}
    </motion.button>
  );
}

function Zone({ zone, count, empty, children }: { zone: ZoneId; count: number; empty: string; children: ReactNode }) {
  const { color, hint, Icon } = ZONE_LOOK[zone];
  return (
    <section
      className="flex min-w-0 flex-col rounded-2xl border p-2 shadow-[0_1px_2px_rgb(15_23_42_/_0.05),0_12px_28px_-18px_rgb(15_23_42_/_0.45)]"
      style={{
        background: `linear-gradient(180deg, color-mix(in srgb, ${color} 12%, var(--c-surface)), color-mix(in srgb, ${color} 5%, var(--c-surface)))`,
        borderColor: `color-mix(in srgb, ${color} 26%, var(--c-line))`,
      }}
    >
      <header className="mb-2 flex items-center gap-2 px-1 pt-0.5">
        <span className="grid size-6 shrink-0 place-items-center rounded-lg text-white shadow-[0_2px_6px_-2px_rgb(15_23_42_/_0.4)]" style={{ background: color }}>
          <Icon className="size-3.5" strokeWidth={2.4} aria-hidden />
        </span>
        <span className="truncate text-[12.5px] font-semibold text-ink">{ZONE_NAMES[zone]}</span>
        <span className="hidden truncate text-[11.5px] text-ink-3 xl:inline">· {hint}</span>
        <motion.span
          key={count}
          initial={{ scale: 1.4 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 18 }}
          className="ml-auto min-w-6 shrink-0 rounded-full px-1.5 text-center text-[11px] font-semibold leading-5 tabular-nums"
          style={{ background: `color-mix(in srgb, ${color} 18%, transparent)`, color: `color-mix(in srgb, ${color} 70%, var(--c-ink))` }}
        >
          {count}
        </motion.span>
      </header>
      {/* Capped so a long list doesn't push the board out of the way — unless the reader has dragged this strip taller. */}
      <div className="thin-scroll -mx-1 flex min-h-10 flex-1 flex-col gap-2 overflow-y-auto px-1 pb-1.5 pt-0.5 [max-height:var(--zone-max,138px)]">
        {children}
        {count === 0 && (
          <div
            className="flex h-9 shrink-0 items-center rounded-xl border border-dashed px-3 text-[12px] text-ink-3"
            style={{ borderColor: `color-mix(in srgb, ${color} 40%, var(--c-line-strong))` }}
          >
            {empty}
          </div>
        )}
      </div>
    </section>
  );
}

const ADD_EXPLAINED =
  "Copies each file's current version into the staging area. The file stays in your working directory too — that's why it shows up in both. Only the staged copy goes into the next commit.";
const COMMIT_EXPLAINED =
  "Saves every staged copy into the repository as a new commit. The staging area is then empty again, and your working directory doesn't change.";

interface ConnectorProps {
  label: string;
  to: ZoneId;
  active: boolean;
  pulseId: number;
  explanation: string;
}

/** The command that carries files to the next zone. Pulses in that zone's colour when it just ran; click it for an explanation. */
function Connector({ label, to, active, pulseId, explanation }: ConnectorProps) {
  const color = ZONE_LOOK[to].color;
  return (
    <div className="hidden flex-col items-center justify-center gap-1.5 px-0.5 sm:flex">
      <HelpPopover
        label={`What does ${label} do?`}
        side="top"
        align="center"
        trigger={({ open, toggle, label: triggerLabel }) => (
          <button
            type="button"
            onClick={toggle}
            aria-label={triggerLabel}
            aria-expanded={open}
            className="relative grid size-8 place-items-center rounded-full border border-line bg-surface text-ink-3 shadow-[0_2px_6px_-2px_rgb(15_23_42_/_0.25)] transition-colors hover:border-line-strong hover:text-ink"
          >
            {active && (
              <>
                <motion.span
                  key={`ring-${pulseId}`}
                  className="absolute inset-0 rounded-full border-2"
                  style={{ borderColor: color }}
                  initial={{ scale: 1, opacity: 0.8 }}
                  animate={{ scale: 1.9, opacity: 0 }}
                  transition={{ duration: 0.9, ease: "easeOut" }}
                />
                <motion.span
                  key={`fill-${pulseId}`}
                  className="absolute inset-0 rounded-full"
                  style={{ background: color }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.25, 0] }}
                  transition={{ duration: 0.9 }}
                />
              </>
            )}
            <motion.span key={active ? `arrow-${pulseId}` : "arrow"} className="relative" animate={active ? { x: [0, 5, 0] } : undefined} transition={{ duration: 0.5, ease: "easeInOut" }}>
              <ArrowRight className="size-4" aria-hidden />
            </motion.span>
          </button>
        )}
      >
        <div className="space-y-1.5 text-[12.5px] leading-snug text-ink-2">
          <div className="font-mono text-[13px] font-semibold text-ink">{label}</div>
          <p>{explanation}</p>
        </div>
      </HelpPopover>
      <span className="font-mono text-[10.5px] text-ink-3">{label}</span>
    </div>
  );
}
