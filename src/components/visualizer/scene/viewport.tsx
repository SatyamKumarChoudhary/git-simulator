"use client";

import { motion } from "motion/react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface SceneViewportProps {
  /** Size of the world in world units. */
  width: number;
  height: number;
  /** World x-coordinate the camera should keep in view (usually HEAD). */
  focusX?: number;
  /** Non-scaling layer painted behind the world (sky, stars…). */
  backdrop: ReactNode;
  compact?: boolean;
  /** Largest zoom the camera may use (small histories would otherwise be blown up). */
  maxScale?: number;
  className?: string;
  children: ReactNode;
}

/** A camera: zooms the world to fit the available space, centres it, and follows HEAD when it overflows. */
export function SceneViewport({ width, height, focusX, backdrop, compact = false, maxScale = 1.15, className, children }: SceneViewportProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setSize({ w: entry.contentRect.width, h: entry.contentRect.height }));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const fit = size.w > 0 ? Math.min(size.w / width, size.h / height) : 1;
  const scale = Math.min(compact ? Math.min(1, maxScale) : maxScale, Math.max(compact ? 0.4 : 0.62, fit));
  const scaledW = width * scale;
  const scaledH = height * scale;
  const offsetX = Math.max(0, (size.w - scaledW) / 2);
  const offsetY = Math.max(0, (size.h - scaledH) / 2);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || focusX === undefined || scaledW <= el.clientWidth) return;
    el.scrollTo({ left: Math.max(0, focusX * scale - el.clientWidth / 2), behavior: "smooth" });
  }, [focusX, scale, scaledW]);

  return (
    <div className={cn("relative h-full w-full overflow-hidden", className)}>
      <div className="pointer-events-none absolute inset-0">{backdrop}</div>
      <div ref={scrollRef} className="thin-scroll absolute inset-0 overflow-auto">
        <div className="relative" style={{ width: Math.max(scaledW, size.w), height: Math.max(scaledH, size.h) }}>
          <motion.div
            className="absolute left-0 top-0 origin-top-left"
            style={{ width, height }}
            initial={false}
            animate={{ scale, x: offsetX, y: offsetY }}
            transition={{ type: "spring", stiffness: 110, damping: 22 }}
          >
            {children}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
