"use client";

import { Loader2, RotateCcw, Undo2 } from "lucide-react";
import { type KeyboardEvent, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { type Segment, type Tone, engine } from "@/engine";
import { cn } from "@/lib/utils";
import { useCustomCommands } from "@/store/custom-commands-store";
import { type TerminalEntry, promptLabel, useGame } from "@/store/game-store";

/** Terminal colours are tuned for the always-dark terminal card: bright and high-contrast. */
const TONE_CLASS: Record<Tone, string> = {
  default: "text-slate-100",
  muted: "text-slate-400",
  success: "text-emerald-300",
  error: "text-rose-300",
  warning: "text-amber-300",
  info: "text-sky-300",
  accent: "text-violet-300",
  added: "text-emerald-300",
  removed: "text-rose-300",
  branch: "text-sky-300",
  head: "text-cyan-300",
  tag: "text-amber-300",
  hash: "text-amber-300",
  heading: "text-white font-bold",
};

function SegmentText({ segment }: { segment: Segment }) {
  return <span className={cn(TONE_CLASS[segment.tone ?? "default"], segment.bold && "font-bold")}>{segment.text}</span>;
}

function Prompt({ branch }: { branch: string }) {
  return (
    <span className="shrink-0 select-none whitespace-pre-wrap">
      <span className="text-emerald-300">you@gitquest</span>
      <span className="text-slate-500">:</span>
      <span className="text-sky-300">~/project</span>
      {branch && <span className="text-violet-300"> ({branch})</span>}
      <span className="text-slate-400"> $ </span>
    </span>
  );
}

function Entry({ entry }: { entry: TerminalEntry }) {
  switch (entry.kind) {
    case "input":
      return (
        <div className="mt-3 whitespace-pre-wrap break-all first:mt-0">
          <Prompt branch={entry.prompt} />
          <span className="font-semibold text-white">{entry.text}</span>
        </div>
      );
    case "announce":
      return (
        <div className="mt-1 whitespace-pre-wrap break-all text-fuchsia-300">
          <span className="select-none text-fuchsia-400">▸ </span>
          {entry.text}
        </div>
      );
    case "system":
      return <div className={cn("whitespace-pre-wrap", TONE_CLASS[entry.tone])}>{entry.text}</div>;
    case "output":
      return (
        <div className="min-h-[1.25em] whitespace-pre-wrap break-words [tab-size:4]">
          {entry.line.segments.map((segment, i) => (
            <SegmentText key={i} segment={segment} />
          ))}
        </div>
      );
  }
}

export function Terminal({ className }: { className?: string }) {
  const entries = useGame((s) => s.entries);
  const draft = useGame((s) => s.draft);
  const repo = useGame((s) => s.repo);
  const playing = useGame((s) => s.playing);
  const inputHistory = useGame((s) => s.inputHistory);
  const focusRequest = useGame((s) => s.focusRequest);
  const speed = useGame((s) => s.speed);
  const canUndo = useGame((s) => s.undoStack.length > 0);
  const submit = useGame((s) => s.submit);
  const setDraft = useGame((s) => s.setDraft);
  const setSpeed = useGame((s) => s.setSpeed);
  const undo = useGame((s) => s.undo);
  const restart = useGame((s) => s.restart);
  const customCommands = useCustomCommands((s) => s.commands);

  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);
  const [candidates, setCandidates] = useState<string[]>([]);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries, candidates]);

  useEffect(() => {
    const input = inputRef.current;
    if (!input || focusRequest === 0) return;
    input.focus({ preventScroll: true });
    const placeholder = /<[^>]+>/.exec(input.value);
    if (placeholder) input.setSelectionRange(placeholder.index, placeholder.index + placeholder[0].length);
    else input.setSelectionRange(input.value.length, input.value.length);
  }, [focusRequest]);

  useEffect(() => {
    if (!playing) inputRef.current?.focus({ preventScroll: true });
  }, [playing]);

  const ghost = useMemo(() => {
    if (!draft || draft.endsWith(" ")) return "";
    const completion = engine.complete(draft, repo, customCommands);
    return completion.candidates.length === 1 && completion.completed.startsWith(draft) ? completion.completed.slice(draft.length).trimEnd() : "";
  }, [draft, repo, customCommands]);

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      if (playing) return;
      setHistoryIndex(null);
      setCandidates([]);
      submit(draft);
      return;
    }
    if (event.key === "Tab") {
      event.preventDefault();
      const completion = engine.complete(draft, repo, customCommands);
      if (completion.completed !== draft) {
        setDraft(completion.completed);
        setCandidates([]);
      } else {
        setCandidates(completion.candidates.length > 1 ? completion.candidates : []);
      }
      return;
    }
    if (event.key === "ArrowRight" && ghost && event.currentTarget.selectionStart === draft.length) {
      event.preventDefault();
      setDraft(draft + ghost);
      return;
    }
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      if (inputHistory.length === 0) return;
      event.preventDefault();
      const up = event.key === "ArrowUp";
      const current = historyIndex ?? inputHistory.length;
      const next = Math.min(inputHistory.length, Math.max(0, current + (up ? -1 : 1)));
      setHistoryIndex(next === inputHistory.length ? null : next);
      setDraft(next === inputHistory.length ? "" : inputHistory[next]);
      return;
    }
    if (event.key === "l" && event.ctrlKey) {
      event.preventDefault();
      submit("clear");
    }
  };

  return (
    <section
      data-theme="dark"
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-2xl border border-[#1f2740] bg-[#0c1120] shadow-[0_18px_40px_-20px_rgb(15_23_42_/_0.7)]",
        className,
      )}
      onClick={() => {
        if (!window.getSelection()?.toString()) inputRef.current?.focus({ preventScroll: true });
      }}
    >
      <header className="flex items-center gap-1 border-b border-[#1a2136] px-3.5 py-2">
        <span className="mr-2 flex gap-1.5">
          <span className="size-2.5 rounded-full bg-rose-400/90" />
          <span className="size-2.5 rounded-full bg-amber-300/90" />
          <span className="size-2.5 rounded-full bg-emerald-400/90" />
        </span>
        <span className="flex-1 text-[12px] font-medium text-slate-400">Terminal</span>
        <button
          type="button"
          onClick={() => setSpeed(speed === 1 ? 2 : speed === 2 ? 0.5 : 1)}
          title="Animation speed"
          className="rounded-md px-1.5 py-0.5 font-mono text-[12px] text-slate-400 transition hover:bg-white/[0.08] hover:text-white"
        >
          {speed}×
        </button>
        <button
          type="button"
          onClick={undo}
          disabled={!canUndo || playing}
          title="Undo last command"
          className="rounded-md p-1.5 text-slate-400 transition hover:bg-white/[0.08] hover:text-white disabled:opacity-30"
        >
          <Undo2 className="size-4" />
        </button>
        <button type="button" onClick={restart} title="Start over" className="rounded-md p-1.5 text-slate-400 transition hover:bg-white/[0.08] hover:text-white">
          <RotateCcw className="size-4" />
        </button>
      </header>

      <div ref={scrollRef} className="thin-scroll min-h-0 flex-1 overflow-y-auto px-4 py-3 font-mono text-[13.5px] leading-[1.65]">
        {entries.map((entry) => (
          <Entry key={entry.id} entry={entry} />
        ))}
        {candidates.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-x-4 text-slate-400">
            {candidates.map((candidate) => (
              <span key={candidate}>{candidate}</span>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-[#1a2136] bg-[#090d19] px-3 py-2.5">
        <div className="flex items-center gap-2 rounded-xl border border-[#27304a] bg-[#111829] px-3 py-2.5 font-mono transition-colors focus-within:border-violet-400/70 focus-within:shadow-[0_0_0_3px_rgb(167_139_250_/_0.15)]">
          <span className="shrink-0 select-none text-[13px] text-violet-300">{promptLabel(repo) ? `(${promptLabel(repo)})` : "~"}</span>
          <span className="shrink-0 select-none text-[15px] font-bold text-emerald-300">$</span>
          <div className="relative min-w-0 flex-1">
            <input
              ref={inputRef}
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value);
                setCandidates([]);
              }}
              onKeyDown={onKeyDown}
              disabled={playing}
              spellCheck={false}
              autoCapitalize="off"
              autoComplete="off"
              autoCorrect="off"
              aria-label="Terminal input"
              className="relative z-10 w-full bg-transparent text-[15px] text-white caret-amber-300 outline-none placeholder:text-slate-500 disabled:opacity-60"
              placeholder={playing ? "running…" : "Type a git command…"}
            />
            {ghost && (
              <div className="pointer-events-none absolute inset-0 overflow-hidden whitespace-pre text-[15px] text-slate-500">
                <span className="invisible">{draft}</span>
                {ghost}
              </div>
            )}
          </div>
          {playing ? (
            <Loader2 className="size-4 shrink-0 animate-spin text-violet-300" />
          ) : (
            draft && <kbd className="shrink-0 rounded-md border border-[#2d3650] px-1.5 py-0.5 text-[10px] text-slate-400">Enter ↵</kbd>
          )}
        </div>
      </div>

    </section>
  );
}
