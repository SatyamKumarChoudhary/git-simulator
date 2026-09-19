"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("group flex items-center gap-2", className)}>
      <span className="relative grid size-9 place-items-center rounded-xl bg-gradient-to-br from-emerald-400 via-sky-400 to-violet-500 shadow-[0_8px_24px_-8px_rgb(56_189_248_/_0.8)] transition-transform group-hover:rotate-6">
        <svg viewBox="0 0 24 24" className="size-5 text-night-950" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round">
          <circle cx="6" cy="6" r="2.2" />
          <circle cx="6" cy="18" r="2.2" />
          <circle cx="18" cy="9" r="2.2" />
          <path d="M6 8.2v7.6M18 11.2c0 3.5-4 3.8-10.2 5.6" />
        </svg>
      </span>
      <span className="font-display text-xl font-semibold tracking-tight text-ink">
        Git<span className="text-gradient">Quest</span>
      </span>
    </Link>
  );
}
