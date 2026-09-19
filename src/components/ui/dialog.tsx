"use client";

import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { type ReactNode, useEffect } from "react";
import { cn } from "@/lib/utils";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: ReactNode;
  className?: string;
  /** "center" for modals, "right" for a slide-over drawer. */
  placement?: "center" | "right";
}

export function Dialog({ open, onClose, children, title, className, placement = "center" }: DialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const drawer = placement === "right";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={cn("fixed inset-0 z-50 flex", drawer ? "justify-end" : "items-center justify-center p-4")}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-overlay backdrop-blur-sm" onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            className={cn(
              "panel relative flex max-h-full flex-col overflow-hidden bg-surface",
              drawer ? "h-full w-full max-w-xl rounded-l-3xl" : "w-full max-w-lg rounded-3xl",
              className,
            )}
            initial={drawer ? { x: "100%" } : { opacity: 0, scale: 0.92, y: 20 }}
            animate={drawer ? { x: 0 } : { opacity: 1, scale: 1, y: 0 }}
            exit={drawer ? { x: "100%" } : { opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
          >
            {title !== undefined && (
              <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
                <div className="min-w-0 font-display text-lg font-semibold text-ink">{title}</div>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg p-1.5 text-ink-3 transition hover:bg-surface-3 hover:text-ink"
                  aria-label="Close"
                >
                  <X className="size-5" />
                </button>
              </div>
            )}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
