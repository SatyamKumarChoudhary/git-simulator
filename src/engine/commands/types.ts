import type { RepoState } from "../core/types";
import type { Effect, EngineEvent, Narration } from "../runtime/events";
import type { Segment, Tone } from "../runtime/output";
import type { CommandRegistry } from "./registry";

export type CommandProgram = "git" | "shell";

export type CommandCategory =
  | "setup"
  | "snapshots"
  | "branching"
  | "merging"
  | "undo"
  | "rewrite"
  | "remote"
  | "inspect"
  | "files"
  | "simulator";

export const COMMAND_CATEGORIES: ReadonlyArray<{ id: CommandCategory; label: string }> = [
  { id: "setup", label: "Getting started" },
  { id: "snapshots", label: "Snapshots" },
  { id: "branching", label: "Branching" },
  { id: "merging", label: "Merging" },
  { id: "undo", label: "Undo & time travel" },
  { id: "rewrite", label: "Rewriting history" },
  { id: "remote", label: "Remotes & GitHub" },
  { id: "inspect", label: "Inspecting" },
  { id: "files", label: "Files (shell)" },
  { id: "simulator", label: "Simulator" },
];

export interface OptionDefinition {
  /** Single-letter form, e.g. "m" for -m. */
  short?: string;
  /** Long form, e.g. "message" for --message. */
  long?: string;
  takesValue?: boolean;
  valueName?: string;
  description: string;
}

export interface ParsedArgs {
  positionals: string[];
  /** Keyed by the option's key in the command's `options` map. */
  options: Record<string, string | true>;
  /** Everything after a bare `--`, or null when there was none. */
  paths: string[] | null;
}

/** A user-defined command: a named recipe of other commands. */
export interface CustomCommand {
  id: string;
  /** Either a single word (`save`) or a git alias (`git save`). */
  name: string;
  description: string;
  /** Command lines. `$1`..`$9` are replaced with arguments, `$@` with all of them. */
  steps: string[];
}

export interface CommandContext {
  /** A private draft of the repository. Mutate it freely — it is discarded if the command fails. */
  readonly state: RepoState;
  readonly args: ParsedArgs;
  readonly argv: readonly string[];
  readonly registry: CommandRegistry;
  readonly customCommands: readonly CustomCommand[];
  /** False when the command is one step of a chain or custom command. */
  readonly standalone: boolean;

  print(text?: string, tone?: Tone): void;
  printSegments(...segments: Segment[]): void;
  emit(event: EngineEvent): void;
  narrate(narration: Narration): void;
  effect(effect: Effect): void;
  /** Captures an intermediate animation frame (e.g. "staged" before "committed"). */
  checkpoint(): void;
  /** Aborts the command. All changes to `state` are discarded. */
  fail(message: string, hint?: string): never;
}

export interface CommandDefinition {
  program: CommandProgram;
  name: string;
  category: CommandCategory;
  summary: string;
  /** Short usage lines shown in help and the command reference. */
  usage: string[];
  description?: string;
  examples?: string[];
  options?: Record<string, OptionDefinition>;
  /** Defaults to true for git commands and false for shell commands. */
  requiresRepo?: boolean;
  run(ctx: CommandContext): void;
}

/** Identity helper that gives command modules full type inference. */
export function defineCommand(definition: CommandDefinition): CommandDefinition {
  return definition;
}

export function commandLabel(definition: Pick<CommandDefinition, "program" | "name">): string {
  return definition.program === "git" ? `git ${definition.name}` : definition.name;
}
