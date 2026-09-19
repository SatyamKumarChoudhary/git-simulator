"use client";

import { AnimatePresence, motion } from "motion/react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface HelpToggleProps {
  label: string;
  open: boolean;
  onClick: () => void;
  className?: string;
}

/** A small round "?" button. */
export function HelpToggle({ label, open, onClick, className }: HelpToggleProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-expanded={open}
      onClick={onClick}
      className={cn(
        "grid size-6 shrink-0 place-items-center rounded-full border text-[12px] font-semibold transition-colors",
        open ? "border-ink bg-ink text-surface" : "border-line-strong text-ink-3 hover:border-line-strong hover:text-ink",
        className,
      )}
    >
      ?
    </button>
  );
}

interface HelpPopoverProps {
  label: string;
  children: ReactNode;
  align?: "left" | "right" | "center";
  /** Open below the trigger (default) or above it. */
  side?: "bottom" | "top";
  /** Replaces the default "?" button. */
  trigger?: (props: { open: boolean; toggle: () => void; label: string }) => ReactNode;
}

const ALIGN = { left: "left-0", right: "right-0", center: "left-1/2 -translate-x-1/2" } as const;

/** A trigger ("?" by default) that opens a small floating card; closes on outside click or Escape. */
export function HelpPopover({ label, children, align = "left", side = "bottom", trigger }: HelpPopoverProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      {trigger ? (
        trigger({ open, toggle: () => setOpen((value) => !value), label })
      ) : (
        <HelpToggle label={label} open={open} onClick={() => setOpen((value) => !value)} />
      )}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: side === "top" ? 6 : -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: side === "top" ? 6 : -6, scale: 0.97 }}
            transition={{ duration: 0.16 }}
            className={cn(
              "absolute z-50 w-72 rounded-xl border border-line bg-surface p-4 shadow-[0_20px_50px_-20px_rgb(15_23_42_/_0.45)]",
              side === "top" ? "bottom-full mb-2" : "top-8",
              ALIGN[align],
            )}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
