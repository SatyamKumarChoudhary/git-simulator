"use client";

import { Check, Flag } from "lucide-react";
import { useMemo } from "react";
import type { SceneThemeId } from "@/store/settings-store";
import type { GoalPicture } from "./goal-picture";
import { ThemedScene } from "./scene";

/**
 * The board you're aiming for: the same diagram, drawn from the finished repository. It slides in over the live board
 * so both pictures sit in the same place and the difference is the only thing that moves.
 */
export function GoalLayer({ picture, theme, done }: { picture: GoalPicture; theme: SceneThemeId; done: boolean }) {
  const pulse = useMemo(() => ({ id: 1, events: picture.arrivals }), [picture]);

  return (
    <div className="absolute inset-0 flex flex-col bg-canvas">
      {/* A faint green cast, so a glance tells you this is the target and not where you are. */}
      <span className="pointer-events-none absolute inset-0 bg-emerald-500/[0.045]" />

      <span className="absolute left-4 top-3 z-10 flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11.5px] font-medium text-emerald-700 dark:text-emerald-300">
        {done ? <Check className="size-3.5" strokeWidth={3} /> : <Flag className="size-3.5" />}
        {done ? "Goal reached" : picture.changes ? "Final result · make it look like this" : "Final result"}
      </span>

      <div className="relative min-h-0 flex-1">
        <ThemedScene theme={theme} repo={picture.repo} pulse={pulse} />
      </div>

      {!picture.changes ? (
        <p className="relative pb-3 text-center text-[12px] text-ink-3">Nothing changes here — this one asks you to look at the repository, not change it.</p>
      ) : (
        !picture.history && <p className="relative pb-3 text-center text-[12px] text-ink-3">The history stays the same — the difference is in the file areas below.</p>
      )}
    </div>
  );
}
