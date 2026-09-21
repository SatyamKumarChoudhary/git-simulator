"use client";

import { ChevronLeft, ChevronRight, Flag } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { type CSSProperties, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { HelpPopover } from "@/components/ui/help-button";
import { ResizeHandle, useResizable } from "@/components/ui/resize-handle";
import { useMediaQuery } from "@/lib/use-media-query";
import { cn } from "@/lib/utils";
import { useGame } from "@/store/game-store";
import { type SceneThemeId, useSceneTheme } from "@/store/settings-store";
import { CleanZones } from "./clean-zones";
import { GoalLayer } from "./goal-layer";
import { type GoalPicture, goalPictureOf } from "./goal-picture";
import { type ScenePulse, SKINS, ThemedScene } from "./scene";
import type { GuideItem } from "./scene/skin";

/** How the board slides aside when the goal board comes in over it. */
const SLIDE = { duration: 0.52, ease: [0.22, 1, 0.36, 1] } as const;
/** The goal board shows itself once when a level opens: in at PEEK_IN, back out at PEEK_OUT. */
const PEEK_IN = 900;
const PEEK_OUT = 3600;

/** A still pulse: the goal state is drawn as it is, with nothing animating in. */
const STILL: ScenePulse = { id: 0, events: [] };

/** The history board (linked list, railway or space) and the three file areas. */
export function Visualizer() {
  const theme = useSceneTheme();
  const repo = useGame((s) => s.repo);
  const pulse = useGame((s) => s.pulse);
  const insertCommand = useGame((s) => s.insertCommand);
  const draft = useGame((s) => s.draft);
  const level = useGame((s) => s.level);
  const achieved = useGame((s) => s.achieved);
  const conflicts = repo.merge?.conflicts ?? [];
  // Commits that exist on the simulated GitHub but haven't been fetched yet.
  const unfetched = Object.entries(repo.remotes).flatMap(([name, url]) =>
    Object.entries(repo.servers[url]?.branches ?? {})
      .filter(([branch, tip]) => repo.remoteRefs[`${name}/${branch}`] !== tip)
      .map(([branch]) => `${name}/${branch}`),
  );

  const picture = useMemo(() => (level ? goalPictureOf(level) : null), [level]);
  const done = level ? level.goals.every((goal) => achieved.includes(goal.id)) : false;

  const [showGoal, setShowGoal] = useState(false);
  // Once you work the switch yourself, the board stops showing itself.
  const [manual, setManual] = useState(false);
  const [shown, setShown] = useState(picture);
  if (picture !== shown) {
    // A new level: back to the live board, and it may introduce itself again.
    setShown(picture);
    setShowGoal(false);
    setManual(false);
  }
  const goalShowing = showGoal && picture !== null;

  const wide = useMediaQuery("(min-width: 1024px)");
  const columnRef = useRef<HTMLElement>(null);
  const filesRef = useRef<HTMLDivElement>(null);
  const files = useResizable({
    id: "board.files",
    label: "Height of the file areas",
    axis: "y",
    min: 96,
    maxRatio: 0.72,
    paneRef: filesRef,
    containerRef: columnRef,
    invert: true,
  });
  const filesHeight = wide && files.size !== null ? files.size : null;

  useEffect(() => {
    // A level that changes nothing has nothing to introduce; its board is there for the asking, not by itself.
    if (!picture?.changes || manual) return;
    const timers = [setTimeout(() => setShowGoal(true), PEEK_IN), setTimeout(() => setShowGoal(false), PEEK_OUT)];
    return () => timers.forEach(clearTimeout);
  }, [picture, manual]);

  return (
    <section ref={columnRef} className="flex h-full min-h-0 flex-col gap-3 lg:gap-0">
      <div className="panel flex min-h-[380px] flex-1 flex-col overflow-hidden rounded-2xl">
        <div className="flex items-center gap-2 px-4 py-2.5 text-[12px] text-ink-3">
          History
          <HelpPopover label="How to read the history">
            <ReadingGuide items={SKINS[theme].guide} />
          </HelpPopover>
          {conflicts.length > 0 && (
            <span className="truncate rounded-md bg-rose-500/10 px-2 py-0.5 text-rose-600 dark:text-rose-300">merge conflict in {conflicts.join(", ")}</span>
          )}
          {unfetched.length > 0 && (
            <span className="truncate rounded-md bg-sky-500/10 px-2 py-0.5 text-sky-700 dark:text-sky-300">GitHub has new commits · fetch to see them</span>
          )}
        </div>

        {/* One board, two faces: the live repository, and the finished one sliding in over it from the right. */}
        <Board
          picture={picture}
          theme={theme}
          done={done}
          showGoal={goalShowing}
          onToggle={() => {
            setManual(true);
            setShowGoal((open) => !open);
          }}
          live={
            <ThemedScene
              theme={theme}
              repo={repo}
              pulse={pulse}
              onCommitClick={(id) => insertCommand(draft.trim() ? `${draft.replace(/\s+$/, "")} ${id}` : `git checkout ${id}`)}
            />
          }
        />
      </div>

      <ResizeHandle {...files.handle} className="hidden lg:flex" />

      {/* The file areas belong to whichever board is showing, so the finished repository is complete, not half of it. */}
      <div
        ref={filesRef}
        className={cn("shrink-0 rounded-2xl transition-shadow", goalShowing && "shadow-[0_0_0_1px_rgb(16_185_129_/_0.35)]")}
        // A dragged height frees the trays from the height they cap themselves at.
        style={filesHeight ? ({ height: filesHeight, "--zone-max": "none" } as CSSProperties) : undefined}
      >
        <CleanZones repo={goalShowing ? picture.repo : repo} pulse={goalShowing ? STILL : pulse} />
      </div>
    </section>
  );
}

/** The live board, with the finished one waiting off to the right and sliding in over it on request. */
function Board({
  picture,
  theme,
  done,
  live,
  showGoal,
  onToggle,
}: {
  picture: GoalPicture | null;
  theme: SceneThemeId;
  done: boolean;
  live: ReactNode;
  showGoal: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="relative min-h-0 flex-1 overflow-hidden">
      <motion.div
        className="absolute inset-0"
        animate={{ x: showGoal ? "-12%" : "0%", opacity: showGoal ? 0 : 1, scale: showGoal ? 0.97 : 1 }}
        transition={SLIDE}
      >
        {live}
      </motion.div>

      <AnimatePresence>
        {picture && showGoal && (
          <motion.div key="goal" className="absolute inset-0" initial={{ x: "100%" }} animate={{ x: "0%" }} exit={{ x: "100%" }} transition={SLIDE}>
            <GoalLayer picture={picture} theme={theme} done={done} />
          </motion.div>
        )}
      </AnimatePresence>

      {picture && <BoardSwitch showGoal={showGoal} onClick={onToggle} />}
    </div>
  );
}

/** The corner tab that brings the other board in: "Final result" on the live board, "Current" on the goal board. */
function BoardSwitch({ showGoal, onClick }: { showGoal: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={showGoal}
      className={cn(
        "absolute right-3 top-3 z-20 flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11.5px] font-medium shadow-[0_2px_10px_-4px_rgb(15_23_42_/_0.4)] backdrop-blur transition-colors",
        showGoal ? "border-line bg-surface/90 text-ink-2 hover:text-ink" : "border-emerald-500/30 bg-surface/90 text-emerald-700 hover:border-emerald-500/60 dark:text-emerald-300",
      )}
    >
      {showGoal ? (
        <>
          <ChevronLeft className="size-3.5" aria-hidden />
          Current
        </>
      ) : (
        <>
          <Flag className="size-3.5" aria-hidden />
          Final result
          <ChevronRight className="size-3.5" aria-hidden />
        </>
      )}
    </button>
  );
}

function ReadingGuide({ items }: { items: GuideItem[] }) {
  return (
    <div className="space-y-3 text-[12.5px] leading-snug text-ink-2">
      <div className="text-[13px] font-medium text-ink">How to read this</div>
      {items.map((item, i) => (
        <GuideRow key={i} visual={item.visual}>
          {item.text}
        </GuideRow>
      ))}
    </div>
  );
}

function GuideRow({ visual, children }: { visual: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex w-[62px] shrink-0 justify-center">{visual}</span>
      <span>{children}</span>
    </div>
  );
}
