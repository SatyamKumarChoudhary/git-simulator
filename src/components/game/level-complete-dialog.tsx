"use client";

import { ArrowRight, Map as MapIcon, RotateCcw, Star } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { nextLevel } from "@/content";
import { Button, buttonClasses } from "@/components/ui/button";
import { playSound } from "@/lib/sfx";
import { useGame } from "@/store/game-store";
import { useMuted } from "@/store/settings-store";

const CONFETTI_COLORS = ["#34d399", "#38bdf8", "#a78bfa", "#f472b6", "#fbbf24", "#fb923c"];

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 70 }, (_, i) => {
        const angle = (i / 70) * Math.PI * 2;
        const distance = 160 + ((i * 37) % 140);
        return {
          id: i,
          x: Math.cos(angle) * distance,
          y: Math.sin(angle) * distance - 80,
          rotate: (i * 83) % 360,
          color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
          delay: (i % 10) * 0.012,
          round: i % 3 === 0,
        };
      }),
    [],
  );
  return (
    <div className="pointer-events-none absolute left-1/2 top-24 z-0">
      {pieces.map((piece) => (
        <motion.span
          key={piece.id}
          className="absolute block h-3 w-2"
          style={{ background: piece.color, borderRadius: piece.round ? 999 : 2 }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0.4 }}
          animate={{ x: piece.x, y: [0, piece.y, piece.y + 260], opacity: [1, 1, 0], rotate: piece.rotate + 540, scale: 1 }}
          transition={{ duration: 1.9, delay: piece.delay, ease: [0.2, 0.8, 0.4, 1] }}
        />
      ))}
    </div>
  );
}

export function LevelCompleteDialog() {
  const result = useGame((s) => s.result);
  const open = useGame((s) => s.resultOpen);
  const level = useGame((s) => s.level);
  const close = useGame((s) => s.closeResult);
  const restart = useGame((s) => s.restart);
  const next = level ? nextLevel(level.id) : undefined;
  const muted = useMuted();
  // Let the final commit's animation play out before the celebration covers it.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(open);
      if (open && !muted) playSound("fanfare");
    }, open ? 1500 : 0);
    return () => clearTimeout(timer);
  }, [open, muted]);

  return (
    <AnimatePresence>
      {visible && open && result && level && (
        <motion.div className="fixed inset-0 z-50 grid place-items-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-overlay backdrop-blur-sm" onClick={close} />
          <motion.div
            className="panel relative w-full max-w-md overflow-visible rounded-[2rem] bg-surface p-8 text-center"
            initial={{ scale: 0.7, y: 40, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.35 }}
          >
            <Confetti />
            <div className="relative z-10">
              <motion.div className="text-6xl" initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", delay: 0.5 }}>
                🏆
              </motion.div>
              <h2 className="mt-3 font-display text-3xl font-semibold text-ink">Level complete!</h2>
              <p className="mt-1 text-sm text-ink-3">{level.title}</p>

              <div className="mt-6 flex justify-center gap-3">
                {[1, 2, 3].map((n) => (
                  <motion.div
                    key={n}
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: n <= result.stars ? [0, 1.4, 1] : 1, rotate: 0 }}
                    transition={{ delay: 0.7 + n * 0.22, duration: 0.5 }}
                  >
                    <Star
                      className={n <= result.stars ? "size-12 fill-amber-400 text-amber-400 drop-shadow-[0_0_14px_rgb(252_211_77_/_0.7)]" : "size-12 text-ink-4"}
                    />
                  </motion.div>
                ))}
              </div>

              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.5 }} className="mt-6 grid grid-cols-3 gap-2 text-center">
                <Stat label="XP earned" value={`+${result.xpEarned}`} accent="text-amber-700 dark:text-amber-300" />
                <Stat label="Moves" value={`${result.moves}`} hint={`par ${result.par}`} />
                <Stat label="Hints" value={`${result.hintsUsed}`} />
              </motion.div>
              {result.stars < 3 && (
                <p className="mt-4 text-xs text-ink-3">
                  Tip: solve it in about {result.par} state-changing commands without hints for ★★★.
                </p>
              )}

              <div className="mt-7 flex flex-wrap justify-center gap-2">
                <Button variant="ghost" size="md" onClick={restart}>
                  <RotateCcw className="size-4" /> Replay
                </Button>
                <Link href="/" className={buttonClasses("secondary", "md")}>
                  <MapIcon className="size-4" /> Map
                </Link>
                {next ? (
                  <Link href={`/play/${next.level.id}`} className={buttonClasses("primary", "md")}>
                    Next level <ArrowRight className="size-4" />
                  </Link>
                ) : (
                  <Link href="/sandbox" className={buttonClasses("primary", "md")}>
                    Free play <ArrowRight className="size-4" />
                  </Link>
                )}
              </div>
              <button type="button" onClick={close} className="mt-4 text-xs text-ink-3 hover:text-ink-2">
                Keep exploring this level
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Stat({ label, value, hint, accent }: { label: string; value: string; hint?: string; accent?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface-2 px-2 py-3">
      <div className={`font-display text-xl font-semibold ${accent ?? "text-ink"}`}>{value}</div>
      <div className="text-[11px] text-ink-3">
        {label}
        {hint && <span className="block text-[10px] text-ink-4">{hint}</span>}
      </div>
    </div>
  );
}
