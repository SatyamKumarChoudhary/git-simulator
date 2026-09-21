"use client";

import { ChevronLeft, Lock } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AppearanceToggle } from "@/components/appearance-toggle";
import { Logo } from "@/components/brand";
import { CommandStudio } from "@/components/studio/command-studio";
import { Terminal } from "@/components/terminal/terminal";
import { ThemeSwitch } from "@/components/visualizer/theme-switch";
import { Visualizer } from "@/components/visualizer/visualizer";
import { findLevel, previousLevel } from "@/content";
import { ResizeHandle, useResizable } from "@/components/ui/resize-handle";
import { useHydrated } from "@/lib/use-hydrated";
import { useMediaQuery } from "@/lib/use-media-query";
import { currentEntry, isUnlocked } from "@/lib/progression";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { GameStoreContext, type Session, createGameStore, useGame } from "@/store/game-store";
import { useProgress } from "@/store/progress-store";
import { LevelCompleteDialog } from "./level-complete-dialog";
import { MissionPanel } from "./mission-panel";
import { SandboxPanel } from "./sandbox-panel";

export function GameScreen({ session }: { session: Session }) {
  const hydrated = useHydrated();
  const records = useProgress((s) => s.levels);
  // Progress and the saved session both live in the browser: nothing can be decided until it has hydrated.
  if (!hydrated) return <div className="min-h-dvh" />;
  if (session.kind === "level" && !isUnlocked(session.levelId, records)) return <LockedLevel levelId={session.levelId} />;
  return <Game session={session} />;
}

function LockedLevel({ levelId }: { levelId: string }) {
  const records = useProgress((s) => s.levels);
  const entry = findLevel(levelId);
  const previous = entry ? previousLevel(levelId) : undefined;
  const next = currentEntry(records);
  return (
    <div className="grid min-h-dvh place-items-center px-5">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="panel w-full max-w-sm rounded-2xl p-8 text-center">
        <motion.div
          className="mx-auto grid size-14 place-items-center rounded-full border border-line bg-surface-2"
          initial={{ rotate: -12 }}
          animate={{ rotate: [-12, 10, -6, 0] }}
          transition={{ duration: 0.6 }}
        >
          <Lock className="size-6 text-ink-3" />
        </motion.div>
        <h1 className="mt-4 font-display text-xl font-semibold text-ink">{entry ? entry.level.title : "Level"} is locked</h1>
        <p className="mt-2 text-[14px] text-ink-3">
          {previous ? <>Finish “{previous.level.title}” first to unlock it.</> : "Finish the earlier levels first."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link href={`/play/${next.level.id}`} className={buttonClasses("primary", "md")}>
            Play level {next.index + 1}
          </Link>
          <Link href="/" className={buttonClasses("secondary", "md")}>
            Map
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

function Game({ session }: { session: Session }) {
  const [store] = useState(() => createGameStore(session));
  useEffect(() => () => store.getState().dispose(), [store]);

  return (
    <GameStoreContext.Provider value={store}>
      <GameLayout />
    </GameStoreContext.Provider>
  );
}

function GameLayout() {
  const level = useGame((s) => s.level);
  const [studioOpen, setStudioOpen] = useState(false);
  // Panels are only draggable side by side; stacked on a narrow screen they size themselves.
  const wide = useMediaQuery("(min-width: 1024px)");
  const mainRef = useRef<HTMLElement>(null);
  const sideRef = useRef<HTMLDivElement>(null);
  const briefRef = useRef<HTMLDivElement>(null);

  const side = useResizable({
    id: "game.side",
    label: "Width of the question and terminal column",
    axis: "x",
    min: 300,
    maxRatio: 0.62,
    paneRef: sideRef,
    containerRef: mainRef,
  });
  const brief = useResizable({
    id: "game.brief",
    label: level ? "Height of the question panel" : "Height of the sandbox panel",
    axis: "y",
    min: 120,
    maxRatio: 0.78,
    paneRef: briefRef,
    containerRef: sideRef,
  });

  const briefSize = wide && brief.size !== null ? { height: brief.size } : undefined;

  return (
    <div className="flex min-h-dvh flex-col lg:h-dvh">
      <TopBar />
      <main ref={mainRef} className="flex min-h-0 flex-1 flex-col gap-3 px-3 pb-3 lg:flex-row lg:gap-0">
        {/* The column takes a share of the screen rather than a fixed width: roomy on a big monitor, sensible on a small one. */}
        <div
          ref={sideRef}
          className="flex min-h-0 flex-col gap-3 lg:w-[clamp(380px,36%,700px)] lg:shrink-0 lg:gap-0"
          style={wide && side.size !== null ? { width: side.size } : undefined}
        >
          <div ref={briefRef} className={cn("flex min-h-0 flex-col lg:shrink-0", brief.size === null && (level ? "lg:min-h-[55%] lg:max-h-[66%]" : "lg:min-h-[44%] lg:max-h-[56%]"))} style={briefSize}>
            {level ? <MissionPanel className="min-h-0 flex-1" /> : <SandboxPanel className="min-h-0 flex-1" onOpenStudio={() => setStudioOpen(true)} />}
          </div>
          <ResizeHandle {...brief.handle} className="hidden lg:flex" />
          <Terminal className="h-[420px] lg:h-auto lg:min-h-0 lg:flex-1" />
        </div>
        <ResizeHandle {...side.handle} className="hidden lg:flex" />
        <div className="min-h-[640px] lg:min-h-0 lg:flex-1">
          <Visualizer />
        </div>
      </main>
      <CommandStudio open={studioOpen} onClose={() => setStudioOpen(false)} />
      <LevelCompleteDialog />
    </div>
  );
}

function TopBar() {
  return (
    <header className="flex flex-wrap items-center gap-2.5 px-4 py-2.5">
      {/* Back sits on the leading edge, the way every app puts it; the brand follows it. */}
      <Link
        href="/"
        title="Back to the map"
        className="flex items-center gap-1.5 rounded-xl border border-line bg-surface py-1.5 pl-2 pr-3 text-[12.5px] font-medium text-ink-2 shadow-[0_1px_2px_rgb(15_23_42_/_0.06)] transition-colors hover:border-line-strong hover:text-ink"
      >
        <ChevronLeft className="size-4" aria-hidden />
        Back
      </Link>
      <span className="h-5 w-px bg-line" aria-hidden />
      <Logo />
      <div className="ml-auto flex items-center gap-0.5 text-[12px]">
        <ThemeSwitch />
        <AppearanceToggle />
      </div>
    </header>
  );
}

