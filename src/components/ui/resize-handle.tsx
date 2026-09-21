"use client";

import { type KeyboardEvent, type PointerEvent, type RefObject, useLayoutEffect, useState } from "react";
import { clampSize } from "@/lib/resize";
import { useHydrated } from "@/lib/use-hydrated";
import { cn } from "@/lib/utils";
import { useLayout } from "@/store/layout-store";

/** How far the arrow keys move a border, in pixels; Shift makes it a bigger step. */
const STEP = 16;
const BIG_STEP = 48;

export interface ResizableOptions {
  /** Where the size is remembered. */
  id: string;
  /** Announced to screen readers and shown on hover. */
  label: string;
  /** "x" for a border you drag left and right, "y" for one you drag up and down. */
  axis: "x" | "y";
  /** The smallest the panel may get, in pixels. */
  min: number;
  /** The largest, as a share of the space the panel lives in. */
  maxRatio: number;
  /** The panel being resized. Measured when a drag starts, so a panel sized by its content resizes from where it is. */
  paneRef: RefObject<HTMLElement | null>;
  /** The box the panel has to fit inside. Watched, so a remembered size shrinks with the window. */
  containerRef: RefObject<HTMLElement | null>;
  /** True when the panel sits after the border, so dragging towards it makes it bigger. */
  invert?: boolean;
}

export interface HandleProps {
  axis: "x" | "y";
  label: string;
  className?: string;
  onPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerCancel: (event: PointerEvent<HTMLDivElement>) => void;
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  onDoubleClick: () => void;
  "aria-valuenow"?: number;
  "aria-valuemin": number;
  "aria-valuemax"?: number;
  "data-dragging": boolean;
}

export interface Resizable {
  /** The panel's size in pixels, or null while it is still sized by the layout. */
  size: number | null;
  /** Spread onto a <ResizeHandle />. */
  handle: HandleProps;
}

/** Stops the page selecting text (and flickering cursors) while a border is being dragged. */
function setDragCursor(axis: "x" | "y" | null) {
  const style = document.body.style;
  style.cursor = axis === "x" ? "col-resize" : axis === "y" ? "row-resize" : "";
  style.userSelect = axis ? "none" : "";
}

/**
 * A draggable border. The panel keeps whatever size the layout gives it until the border is dragged; from then on the
 * size is the reader's, and it is remembered between visits. Double-click (or Home) hands it back to the layout.
 */
export function useResizable({ id, label, axis, min, maxRatio, paneRef, containerRef, invert }: ResizableOptions): Resizable {
  const hydrated = useHydrated();
  const stored = useLayout((s) => s.sizes[id]);
  const setStored = useLayout((s) => s.setSize);
  const clearStored = useLayout((s) => s.clearSize);
  const [drag, setDrag] = useState<{ from: number; size: number } | null>(null);
  const [live, setLive] = useState<number | null>(null);
  const [room, setRoom] = useState(0);

  // The room the panel has can change without any drag — the window resizes, or a sibling border moves.
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setRoom(axis === "x" ? el.clientWidth : el.clientHeight));
    observer.observe(el);
    return () => observer.disconnect();
  }, [containerRef, axis]);

  const limit = (value: number) => clampSize(value, { min, maxRatio, room });
  // A size remembered on a wider window is brought back inside today's, rather than squeezing its neighbour out.
  const raw = live ?? (hydrated ? (stored ?? null) : null);
  const size = raw === null ? null : limit(raw);

  /** The panel's size right now, whether it came from a drag or from the layout. */
  const measure = () => {
    const box = paneRef.current?.getBoundingClientRect();
    return box ? (axis === "x" ? box.width : box.height) : min;
  };

  const along = (event: PointerEvent<HTMLDivElement>) => (axis === "x" ? event.clientX : event.clientY);
  const stop = () => {
    setDrag(null);
    setDragCursor(null);
  };

  return {
    size,
    handle: {
      axis,
      label,
      "aria-valuenow": size ?? undefined,
      "aria-valuemin": min,
      "aria-valuemax": room > 0 ? Math.round(room * maxRatio) : undefined,
      "data-dragging": drag !== null,
      onPointerDown: (event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        setDrag({ from: along(event), size: measure() });
        setDragCursor(axis);
      },
      onPointerMove: (event) => {
        if (!drag) return;
        const moved = along(event) - drag.from;
        setLive(limit(drag.size + (invert ? -moved : moved)));
      },
      onPointerUp: (event) => {
        if (!drag) return;
        event.currentTarget.releasePointerCapture(event.pointerId);
        stop();
        if (live !== null) setStored(id, live);
        setLive(null);
      },
      onPointerCancel: (event) => {
        if (!drag) return;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
        stop();
        setLive(null);
      },
      onKeyDown: (event) => {
        const [back, forward] = axis === "x" ? ["ArrowLeft", "ArrowRight"] : ["ArrowUp", "ArrowDown"];
        const step = event.shiftKey ? BIG_STEP : STEP;
        const nudge = (delta: number) => setStored(id, limit((size ?? measure()) + (invert ? -delta : delta)));
        if (event.key === back) {
          event.preventDefault();
          nudge(-step);
        } else if (event.key === forward) {
          event.preventDefault();
          nudge(step);
        } else if (event.key === "Home" || event.key === "Escape") {
          event.preventDefault();
          clearStored(id);
        }
      },
      onDoubleClick: () => clearStored(id),
    },
  };
}

/** The border itself: a thin strip with a grip in the middle, sitting in the gap between two panels. */
export function ResizeHandle({ axis, label, className, ...props }: HandleProps) {
  return (
    <div
      role="separator"
      tabIndex={0}
      aria-orientation={axis === "x" ? "vertical" : "horizontal"}
      aria-label={label}
      title={`${label} — drag to resize, double-click to reset`}
      className={cn(
        "group relative flex shrink-0 touch-none select-none items-center justify-center rounded-full outline-none",
        axis === "x" ? "w-3 cursor-col-resize" : "h-3 cursor-row-resize",
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          "rounded-full bg-line-strong transition-[background-color,transform] duration-150",
          "group-hover:bg-ink-3 group-focus-visible:bg-sky-500 group-data-[dragging=true]:bg-sky-500",
          axis === "x"
            ? "h-9 w-[3px] group-hover:scale-y-110 group-data-[dragging=true]:scale-y-110"
            : "h-[3px] w-9 group-hover:scale-x-110 group-data-[dragging=true]:scale-x-110",
        )}
      />
    </div>
  );
}
