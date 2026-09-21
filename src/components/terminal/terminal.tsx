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

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const promptRef = useRef<HTMLSpanElement>(null);
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);
  const [candidates, setCandidates] = useState<string[]>([]);
  const [promptWidth, setPromptWidth] = useState(0);
  const [width, setWidth] = useState(0);

  // The prompt is measured, not guessed: the branch name in it changes, and so does the font once it loads.
  useLayoutEffect(() => {
    const el = promptRef.current;
    const box = scrollRef.current;
    if (!el || !box) return;
    const observer = new ResizeObserver(() => {
      setPromptWidth(el.getBoundingClientRect().width);
      setWidth(box.clientWidth);
    });
    observer.observe(el);
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  // One line until the command outgrows it, then as many as it needs.
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${el.scrollHeight}px`;
  }, [draft, promptWidth, width]);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries, candidates, draft, playing]);

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

  /** Only the very first line carries a hint; after that the prompt is bare, the way a real shell is. */
  const hint = inputHistory.length === 0 && !playing ? "type a command…" : "";

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
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

      <div ref={scrollRef} className="thin-scroll min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-3 font-mono text-[13.5px] leading-[1.65]">
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

        {/*
          The live prompt sits in the stream, exactly where the next line of a real terminal would be. The prompt is
          drawn over the first line and the text is indented past it, so a command too long for one line wraps to the
          full width below — the way a real terminal wraps — instead of scrolling its beginning out of sight.
        */}
        <div className={cn("relative mt-3", playing && "opacity-40")}>
          <span ref={promptRef} className="pointer-events-none absolute left-0 top-0">
            <Prompt branch={promptLabel(repo)} />
          </span>
          <textarea
            ref={inputRef}
            rows={1}
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
            style={{ textIndent: promptWidth }}
            className="block w-full resize-none overflow-hidden break-all bg-transparent p-0 font-mono text-[13.5px] font-semibold leading-[1.65] text-white caret-emerald-300 outline-none placeholder:font-normal placeholder:text-slate-600 disabled:opacity-70"
            placeholder={hint}
          />
          {ghost && (
            <span
              aria-hidden
              style={{ textIndent: promptWidth }}
              className="pointer-events-none absolute inset-0 whitespace-pre-wrap break-all font-semibold text-slate-600"
            >
              <span className="invisible">{draft}</span>
              {ghost}
            </span>
          )}
          {playing && <Loader2 className="absolute right-0 top-1 size-3.5 animate-spin text-violet-300" />}
        </div>
      </div>

    </section>
  );
}
