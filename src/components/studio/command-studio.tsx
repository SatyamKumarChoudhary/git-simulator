"use client";

import { BookOpen, Check, Pencil, Play, Plus, Search, Sparkles, Trash2, X, Zap } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import {
  COMMAND_CATEGORIES,
  type CustomCommand,
  type RepoState,
  commandLabel,
  engine,
  requiredArgumentCount,
  validateCustomCommand,
} from "@/engine";
import { cn } from "@/lib/utils";
import { useCustomCommands } from "@/store/custom-commands-store";
import { useGame } from "@/store/game-store";

type Tab = "custom" | "reference";

export function CommandStudio({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("custom");

  return (
    <Dialog
      open={open}
      onClose={onClose}
      placement="right"
      title={
        <span className="flex items-center gap-2">
          <Sparkles className="size-5 text-fuchsia-600 dark:text-fuchsia-300" /> Command Studio
        </span>
      }
    >
      <div className="flex gap-1 border-b border-line px-5 pt-3">
        {(
          [
            { id: "custom", label: "My commands", icon: Zap },
            { id: "reference", label: "Built-in reference", icon: BookOpen },
          ] as const
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "relative flex items-center gap-1.5 px-3 pb-2.5 text-sm font-semibold transition",
              tab === id ? "text-ink" : "text-ink-3 hover:text-ink-2",
            )}
          >
            <Icon className="size-4" /> {label}
            {tab === id && <motion.span layoutId="studio-tab" className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-fuchsia-400" />}
          </button>
        ))}
      </div>
      <div className="thin-scroll min-h-0 flex-1 overflow-y-auto p-5">
        {tab === "custom" ? <CustomCommandsTab onRun={onClose} /> : <ReferenceTab onPick={onClose} />}
      </div>
    </Dialog>
  );
}

function dryRun(name: string, draft: { id: string | null; description: string }, steps: string[], args: string, commands: CustomCommand[], repo: RepoState) {
  const trial: CustomCommand = { id: draft.id ?? "__preview", name, description: draft.description, steps };
  const others = commands.filter((command) => command.id !== draft.id && command.name !== name);
  const result = engine.execute(`${name} ${args}`.trim(), repo, { customCommands: [...others, trial] });
  return result.frames.map((frame, i) => ({
    key: i,
    label: frame.announce ?? (i === 0 ? `⚡ ${name}` : "…"),
    ok: frame.ok,
    detail: frame.ok ? null : frame.output.map((line) => line.segments.map((segment) => segment.text).join("")).join("\n"),
  }));
}

interface Draft {
  id: string | null;
  name: string;
  description: string;
  steps: string;
}

const EMPTY_DRAFT: Draft = { id: null, name: "", description: "", steps: "" };

function CustomCommandsTab({ onRun }: { onRun: () => void }) {
  const commands = useCustomCommands((s) => s.commands);
  const add = useCustomCommands((s) => s.add);
  const update = useCustomCommands((s) => s.update);
  const remove = useCustomCommands((s) => s.remove);
  const restoreExamples = useCustomCommands((s) => s.restoreExamples);
  const repo = useGame((s) => s.repo);
  const submit = useGame((s) => s.submit);
  const insertCommand = useGame((s) => s.insertCommand);
  const playing = useGame((s) => s.playing);

  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [formOpen, setFormOpen] = useState(false);
  const [testArgs, setTestArgs] = useState("");

  const steps = draft.steps.split("\n").map((step) => step.trim()).filter(Boolean);
  const name = draft.name.trim().replace(/\s+/g, " ");
  const problems = validateCustomCommand({ name, description: draft.description, steps }, engine.registry, commands, draft.id ?? undefined);
  const touched = draft.name !== "" || draft.steps !== "";

  // A dry run is cheap (a handful of in-memory commands), so it simply re-runs on every keystroke.
  const preview = formOpen && problems.length === 0 ? dryRun(name, draft, steps, testArgs, commands, repo) : null;

  const save = () => {
    if (problems.length > 0) return;
    const command = { name, description: draft.description.trim(), steps };
    if (draft.id) update(draft.id, command);
    else add(command);
    setDraft(EMPTY_DRAFT);
    setFormOpen(false);
    setTestArgs("");
  };

  const run = (command: CustomCommand) => {
    if (requiredArgumentCount(command.steps) > 0 || command.steps.some((step) => step.includes("$@"))) {
      insertCommand(`${command.name} `);
    } else {
      submit(command.name);
    }
    onRun();
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-fuchsia-400/20 bg-gradient-to-br from-fuchsia-500/10 to-violet-500/5 p-4">
        <div className="font-display text-base font-semibold text-ink">Build your own commands</div>
        <p className="mt-1 text-[13px] leading-relaxed text-ink-2">
          Bundle several commands into one — just like real <code className="text-fuchsia-600 dark:text-fuchsia-300">git alias</code>. When you run it, every step animates one after another.
          Use <code className="text-amber-700 dark:text-amber-300">$1</code>, <code className="text-amber-700 dark:text-amber-300">$2</code> for arguments and <code className="text-amber-700 dark:text-amber-300">$@</code> for all of them.
        </p>
      </div>

      <AnimatePresence initial={false} mode="wait">
        {formOpen ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-3 rounded-2xl border border-line bg-surface p-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-ink">{draft.id ? "Edit command" : "New command"}</span>
              <button
                type="button"
                onClick={() => {
                  setFormOpen(false);
                  setDraft(EMPTY_DRAFT);
                }}
                className="rounded-md p-1 text-ink-3 hover:bg-surface-3 hover:text-ink"
                aria-label="Cancel"
              >
                <X className="size-4" />
              </button>
            </div>
            <Field label="Name" hint="one word, or git + word">
              <input
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                placeholder="git save"
                className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 font-mono text-sm text-ink outline-none focus:border-fuchsia-400/60"
              />
            </Field>
            <Field label="Description" hint="optional">
              <input
                value={draft.description}
                onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                placeholder="Stage everything and commit"
                className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-sm text-ink outline-none focus:border-fuchsia-400/60"
              />
            </Field>
            <Field label="Steps" hint="one command per line">
              <textarea
                value={draft.steps}
                onChange={(event) => setDraft({ ...draft, steps: event.target.value })}
                placeholder={'git add .\ngit commit -m "$@"'}
                rows={4}
                spellCheck={false}
                className="w-full resize-y rounded-xl border border-line bg-surface-2 px-3 py-2 font-mono text-[13px] leading-relaxed text-ink outline-none focus:border-fuchsia-400/60"
              />
            </Field>

            {touched && problems.length > 0 && (
              <ul className="space-y-1 rounded-xl border border-rose-400/20 bg-rose-500/[0.07] p-3 text-xs text-rose-600 dark:text-rose-200">
                {problems.map((problem) => (
                  <li key={problem}>• {problem}</li>
                ))}
              </ul>
            )}

            {preview && (
              <div className="rounded-xl border border-line bg-surface-3 p-3">
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-ink-3">Dry run on your current repo</span>
                  <input
                    value={testArgs}
                    onChange={(event) => setTestArgs(event.target.value)}
                    placeholder="arguments…"
                    className="ml-auto w-36 rounded-lg border border-line bg-surface px-2 py-1 font-mono text-[11px] text-ink outline-none"
                  />
                </div>
                <ol className="space-y-1 font-mono text-[12px]">
                  {preview.map((step) => (
                    <li key={step.key} className={step.ok ? "text-ink-2" : "text-rose-600 dark:text-rose-300"}>
                      <span className="mr-1.5">{step.ok ? "✓" : "✗"}</span>
                      {step.label}
                      {step.detail && <pre className="mt-1 whitespace-pre-wrap pl-5 text-[11px] text-rose-600 dark:text-rose-300/80">{step.detail}</pre>}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFormOpen(false);
                  setDraft(EMPTY_DRAFT);
                }}
              >
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={save} disabled={problems.length > 0}>
                <Check className="size-3.5" /> {draft.id ? "Save changes" : "Create command"}
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div key="new" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Button variant="primary" className="w-full" onClick={() => setFormOpen(true)}>
              <Plus className="size-4" /> New custom command
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-2.5">
        <AnimatePresence initial={false}>
          {commands.map((command) => (
            <motion.div
              key={command.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="rounded-2xl border border-line bg-surface-2 p-3.5"
            >
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-sm font-bold text-amber-700 dark:text-amber-300">{command.name}</div>
                  {command.description && <div className="mt-0.5 text-xs text-ink-3">{command.description}</div>}
                </div>
                <button
                  type="button"
                  onClick={() => run(command)}
                  disabled={playing}
                  className="flex items-center gap-1 rounded-lg bg-emerald-400/15 px-2 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 transition hover:bg-emerald-400/25 disabled:opacity-40"
                >
                  <Play className="size-3 fill-current" /> Run
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDraft({ id: command.id, name: command.name, description: command.description, steps: command.steps.join("\n") });
                    setFormOpen(true);
                  }}
                  className="rounded-lg p-1.5 text-ink-3 transition hover:bg-surface-3 hover:text-ink"
                  aria-label={`Edit ${command.name}`}
                >
                  <Pencil className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => remove(command.id)}
                  className="rounded-lg p-1.5 text-ink-3 transition hover:bg-rose-500/15 hover:text-rose-600 dark:hover:text-rose-300"
                  aria-label={`Delete ${command.name}`}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
              <ol className="mt-2.5 space-y-1 rounded-xl border border-line bg-surface p-2.5 font-mono text-[12.5px] text-ink">
                {command.steps.map((step, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="select-none text-ink-4">{i + 1}</span>
                    <span className="break-all">{step}</span>
                  </li>
                ))}
              </ol>
            </motion.div>
          ))}
        </AnimatePresence>
        {commands.length === 0 && (
          <div className="rounded-2xl border border-dashed border-line p-6 text-center text-sm text-ink-3">
            No custom commands yet.{" "}
            <button type="button" onClick={restoreExamples} className="font-semibold text-fuchsia-600 dark:text-fuchsia-300 hover:underline">
              Restore the examples
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 flex items-baseline gap-2 text-xs font-bold text-ink-2">
        {label} {hint && <span className="font-normal text-ink-3">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

function ReferenceTab({ onPick }: { onPick: () => void }) {
  const insertCommand = useGame((s) => s.insertCommand);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const definitions = engine.registry.list();
  const q = query.trim().toLowerCase();
  const filtered = definitions.filter((d) => !q || commandLabel(d).includes(q) || d.summary.toLowerCase().includes(q));

  return (
    <div className="space-y-5">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search commands…"
          className="w-full rounded-xl border border-line bg-surface-2 py-2 pl-9 pr-3 text-sm text-ink outline-none focus:border-violet-400/60"
        />
      </div>
      {COMMAND_CATEGORIES.map((category) => {
        const items = filtered.filter((d) => d.category === category.id);
        if (items.length === 0) return null;
        return (
          <div key={category.id}>
            <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-ink-3">{category.label}</div>
            <div className="space-y-1.5">
              {items.map((definition) => {
                const label = commandLabel(definition);
                const isOpen = expanded === label;
                return (
                  <div key={label} className="rounded-xl border border-line bg-surface-2">
                    <button type="button" onClick={() => setExpanded(isOpen ? null : label)} className="flex w-full items-baseline gap-3 px-3 py-2 text-left">
                      <span className="shrink-0 font-mono text-[13px] font-bold text-sky-700 dark:text-sky-300">{label}</span>
                      <span className="truncate text-xs text-ink-3">{definition.summary}</span>
                    </button>
                    {isOpen && (
                      <div className="space-y-2 border-t border-line px-3 py-2.5 text-xs">
                        {definition.description && <p className="text-ink-2">{definition.description}</p>}
                        <div className="flex flex-wrap gap-1.5">
                          {[...definition.usage, ...(definition.examples ?? [])]
                            .filter((value, i, all) => all.indexOf(value) === i)
                            .map((usage) => (
                              <button
                                key={usage}
                                type="button"
                                onClick={() => {
                                  insertCommand(usage);
                                  onPick();
                                }}
                                className="rounded-lg border border-line bg-surface-2 px-2 py-1 font-mono text-[11px] text-emerald-700 dark:text-emerald-300 transition hover:border-emerald-400/50"
                              >
                                {usage}
                              </button>
                            ))}
                        </div>
                        {Object.values(definition.options ?? {}).length > 0 && (
                          <ul className="space-y-0.5 font-mono text-[11px]">
                            {Object.values(definition.options ?? {}).map((option) => (
                              <li key={`${option.short}${option.long}`} className="flex gap-2">
                                <span className="shrink-0 text-violet-600 dark:text-violet-300">
                                  {[option.short && `-${option.short}`, option.long && `--${option.long}`].filter(Boolean).join(", ")}
                                </span>
                                <span className="font-sans text-ink-3">{option.description}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
