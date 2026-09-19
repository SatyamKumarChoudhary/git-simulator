"use client";

import { sandboxPresets } from "@/content";
import { cn } from "@/lib/utils";
import { useGame } from "@/store/game-store";

export function SandboxPanel({ className, onOpenStudio }: { className?: string; onOpenStudio: () => void }) {
  const session = useGame((s) => s.session);
  const loadPreset = useGame((s) => s.loadPreset);
  const activePreset = session.kind === "sandbox" ? session.presetId : null;

  return (
    <section className={cn("panel thin-scroll flex min-h-0 flex-col gap-4 overflow-y-auto rounded-2xl p-5", className)}>
      <div>
        <div className="text-[11px] text-ink-3">Sandbox</div>
        <h1 className="mt-1 font-display text-xl font-semibold text-ink">Free play</h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-ink-3">No goals. Pick a starting point and try anything.</p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {sandboxPresets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => loadPreset(preset.id)}
            title={preset.description}
            className={cn(
              "rounded-md px-2.5 py-1 text-[12px] transition-colors",
              activePreset === preset.id ? "bg-surface-3 text-ink" : "text-ink-3 hover:bg-surface-2 hover:text-ink",
            )}
          >
            {preset.title}
          </button>
        ))}
      </div>
      <button type="button" onClick={onOpenStudio} className="w-fit text-[12px] text-ink-3 transition-colors hover:text-ink">
        Create your own commands →
      </button>
    </section>
  );
}
