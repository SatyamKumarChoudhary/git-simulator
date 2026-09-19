"use client";

import { ChevronLeft, ChevronRight, Lock } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AppearanceToggle } from "@/components/appearance-toggle";
import { Logo } from "@/components/brand";
import { CommandStudio } from "@/components/studio/command-studio";
import { Terminal } from "@/components/terminal/terminal";
import { ThemeSwitch } from "@/components/visualizer/theme-switch";
import { Visualizer } from "@/components/visualizer/visualizer";
import { findLevel, nextLevel, previousLevel } from "@/content";
import { useHydrated } from "@/lib/use-hydrated";
import { currentEntry, isUnlocked } from "@/lib/progression";
import { cn } from "@/lib/utils";
import { buttonClasses } from "@/components/ui/button";
import { GameStoreContext, type Session, createGameStore, useGame } from "@/store/game-store";
import { useProgress } from "@/store/progress-store";
import { LevelCompleteDialog } from "./level-complete-dialog";
import { MissionPanel } from "./mission-panel";
import { SandboxPanel } from "./sandbox-panel";

export function GameScreen({ session }: { session: Session }) {
  const hydrated = useHydrated();
  const records = useProgress((s) => s.levels);
  if (session.kind === "level") {
    // Progress lives in the browser, so wait for it before deciding whether the level is open.
    if (!hydrated) return <div className="min-h-dvh" />;
    if (!isUnlocked(session.levelId, records)) return <LockedLevel levelId={session.levelId} />;
  }
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

  return (
    <div className="flex min-h-dvh flex-col lg:h-dvh">
      <TopBar />
      <main className="grid min-h-0 flex-1 grid-cols-1 gap-3 px-3 pb-3 lg:grid-cols-[minmax(340px,400px)_1fr]">
        <div className="flex min-h-0 flex-col gap-3">
          {level ? (
            <MissionPanel className="lg:max-h-[66%] lg:shrink-0" />
          ) : (
            <SandboxPanel className="lg:max-h-[48%] lg:shrink-0" onOpenStudio={() => setStudioOpen(true)} />
          )}
          <Terminal className="h-[420px] lg:h-auto lg:flex-1" />
        </div>
        <div className="min-h-[640px] lg:min-h-0">
          <Visualizer />
        </div>
      </main>
      <CommandStudio open={studioOpen} onClose={() => setStudioOpen(false)} />
      <LevelCompleteDialog />
    </div>
  );
}

function TopBar() {
  const level = useGame((s) => s.level);
  const hydrated = useHydrated();
  const records = useProgress((s) => s.levels);
  const entry = level ? findLevel(level.id) : undefined;
  const prev = level ? previousLevel(level.id) : undefined;
  const next = level ? nextLevel(level.id) : undefined;

  return (
    <header className="flex flex-wrap items-center gap-4 px-4 py-2.5">
      <Logo />
      {entry && (
        <nav className="flex items-center gap-1">
          <NavArrow href={prev ? `/play/${prev.level.id}` : null} label="Previous level" direction="left" />
          <div className="hidden items-center sm:flex">
            {entry.world.levels.map((worldLevel, i) => {
              const done = hydrated && Boolean(records[worldLevel.id]);
              const current = worldLevel.id === entry.level.id;
              const open = hydrated && isUnlocked(worldLevel.id, records);
              const dot = (
                <span
                  className={cn(
                    "block h-1.5 rounded-full transition-all",
                    current ? "w-5 bg-ink-2" : done ? "w-1.5 bg-emerald-500" : open ? "w-1.5 bg-ink-4 hover:bg-ink-3" : "w-1.5 bg-line-strong",
                  )}
                />
              );
              return open ? (
                <Link key={worldLevel.id} href={`/play/${worldLevel.id}`} title={`${i + 1}. ${worldLevel.title}`} className="grid h-6 place-items-center px-1">
                  {dot}
                </Link>
              ) : (
                <span key={worldLevel.id} title={`${worldLevel.title} (locked)`} className="grid h-6 place-items-center px-1">
                  {dot}
                </span>
              );
            })}
          </div>
          <NavArrow href={next && hydrated && isUnlocked(next.level.id, records) ? `/play/${next.level.id}` : null} label="Next level" direction="right" />
        </nav>
      )}
      <div className="ml-auto flex items-center gap-0.5 text-[12px]">
        <ThemeSwitch />
        <AppearanceToggle />
      </div>
    </header>
  );
}

function NavArrow({ href, label, direction }: { href: string | null; label: string; direction: "left" | "right" }) {
  const Icon = direction === "left" ? ChevronLeft : ChevronRight;
  if (!href) {
    return (
      <span className="grid size-7 place-items-center rounded-full text-ink-4" aria-hidden>
        <Icon className="size-4" />
      </span>
    );
  }
  return (
    <Link href={href} aria-label={label} className="grid size-7 place-items-center rounded-full text-ink-3 transition hover:bg-surface-3 hover:text-ink">
      <Icon className="size-4" />
    </Link>
  );
}
