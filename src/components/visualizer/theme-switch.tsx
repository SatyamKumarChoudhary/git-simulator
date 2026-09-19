"use client";

import { cn } from "@/lib/utils";
import { type SceneThemeId, useSceneTheme, useSettings } from "@/store/settings-store";

const VIEWS: ReadonlyArray<{ id: SceneThemeId; label: string }> = [
  { id: "clean", label: "Linked list" },
  { id: "railway", label: "Railway" },
  { id: "galaxy", label: "Space" },
];

/** Picks how the history is drawn. */
export function ThemeSwitch({ className }: { className?: string }) {
  const active = useSceneTheme();
  const setTheme = useSettings((s) => s.setTheme);

  return (
    <div className={cn("flex rounded-lg bg-surface-2 p-0.5", className)}>
      {VIEWS.map((view) => (
        <button
          key={view.id}
          type="button"
          onClick={() => setTheme(view.id)}
          aria-pressed={active === view.id}
          className={cn("rounded-md px-2 py-0.5 text-[11px] transition-colors", active === view.id ? "bg-surface-3 text-ink" : "text-ink-3 hover:text-ink-2")}
        >
          {view.label}
        </button>
      ))}
    </div>
  );
}
