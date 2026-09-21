"use client";

import { Moon, Sun } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useHydrated } from "@/lib/use-hydrated";
import { cn } from "@/lib/utils";
import { useSettings } from "@/store/settings-store";

/** Sun / moon button that flips between the light and dark look. */
export function AppearanceToggle({ className }: { className?: string }) {
  const hydrated = useHydrated();
  const appearance = useSettings((s) => s.appearance);
  const setAppearance = useSettings((s) => s.setAppearance);
  // Dark until proven otherwise: it is the default, so assuming it before hydration keeps the icon from flipping.
  const dark = !hydrated || appearance === "dark";

  return (
    <button
      type="button"
      onClick={() => setAppearance(dark ? "light" : "dark")}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Light mode" : "Dark mode"}
      className={cn("relative grid size-8 place-items-center overflow-hidden rounded-lg text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink", className)}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={dark ? "moon" : "sun"}
          initial={{ y: 12, rotate: -60, opacity: 0 }}
          animate={{ y: 0, rotate: 0, opacity: 1 }}
          exit={{ y: -12, rotate: 60, opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {dark ? <Moon className="size-4" /> : <Sun className="size-4" />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
