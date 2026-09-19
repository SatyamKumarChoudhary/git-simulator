"use client";

import type { ReactNode } from "react";
import { HelpPopover } from "@/components/ui/help-button";
import { useGame } from "@/store/game-store";
import { useSceneTheme } from "@/store/settings-store";
import { CleanZones } from "./clean-zones";
import { SKINS, ThemedScene } from "./scene";
import type { GuideItem } from "./scene/skin";

/** The history board (linked list, railway or space) and the three file areas. */
export function Visualizer() {
  const theme = useSceneTheme();
  const repo = useGame((s) => s.repo);
  const pulse = useGame((s) => s.pulse);
  const insertCommand = useGame((s) => s.insertCommand);
  const draft = useGame((s) => s.draft);
  const conflicts = repo.merge?.conflicts ?? [];
  // Commits that exist on the simulated GitHub but haven't been fetched yet.
  const unfetched = Object.entries(repo.remotes).flatMap(([name, url]) =>
    Object.entries(repo.servers[url]?.branches ?? {})
      .filter(([branch, tip]) => repo.remoteRefs[`${name}/${branch}`] !== tip)
      .map(([branch]) => `${name}/${branch}`),
  );

  return (
    <section className="flex h-full min-h-0 flex-col gap-3">
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

        <div className="relative min-h-0 flex-1">
          <ThemedScene
            theme={theme}
            repo={repo}
            pulse={pulse}
            onCommitClick={(id) => insertCommand(draft.trim() ? `${draft.replace(/\s+$/, "")} ${id}` : `git checkout ${id}`)}
          />
        </div>
      </div>

      <CleanZones repo={repo} pulse={pulse} />
    </section>
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
