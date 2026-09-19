import type { CommandRegistry } from "../commands/registry";
import { commandHelpLines } from "../commands/shared/help";
import { assertValidPath } from "../commands/shared/paths";
import { type CommandContext, type CommandDefinition, type CustomCommand, commandLabel } from "../commands/types";
import { CommandError } from "../core/errors";
import { cloneState, statesEqual } from "../core/repo";
import type { RepoState } from "../core/types";
import { own } from "../core/utils";
import { parseArgs } from "../parser/args";
import { type CommandSegment, parseCommandLine } from "../parser/command-line";
import { MAX_CUSTOM_DEPTH, expandSteps } from "./custom-commands";
import type { Effect, EngineEvent, Narration } from "./events";
import { type OutputLine, type Segment, type Tone, lineOf, plainText, seg } from "./output";

/** Editors people instinctively reach for; the simulator has none, so explain why that is fine. */
const GIT_VERSION = "2.45.0";

const EDITORS = new Set(["code", "vim", "vi", "nvim", "nano", "emacs", "subl", "open", "notepad", "gedit", "idea"]);

/** One step of animation: a repository snapshot plus everything that happened to reach it. */
export interface Frame {
  state: RepoState;
  /** Sub-command text to echo before the output (for chains and custom commands). */
  announce: string | null;
  output: OutputLine[];
  events: EngineEvent[];
  narration: Narration | null;
  effects: Effect[];
  ok: boolean;
  /** Present on the last frame of each simple command. */
  completed: { command: string; ok: boolean; changed: boolean } | null;
}

export interface ExecutionResult {
  frames: Frame[];
  state: RepoState;
  ok: boolean;
}

export interface ExecuteOptions {
  customCommands?: readonly CustomCommand[];
}

type Resolution =
  | { kind: "builtin"; definition: CommandDefinition; args: string[] }
  | { kind: "custom"; command: CustomCommand; args: string[] }
  | { kind: "version" }
  | { kind: "unknown"; message: string; hint: string };

interface Outcome {
  state: RepoState;
  ok: boolean;
}

function errorLines(message: string, hint?: string): OutputLine[] {
  const lines = message.split("\n").map((text) => lineOf(text, "error"));
  if (hint) lines.push({ segments: [seg("hint: ", "warning", true), seg(hint, "warning")] });
  return lines;
}

class Execution {
  readonly frames: Frame[] = [];

  constructor(
    private readonly registry: CommandRegistry,
    private readonly customCommands: readonly CustomCommand[],
  ) {}

  runInput(input: string, state: RepoState, depth: number): Outcome {
    let segments: CommandSegment[];
    try {
      segments = parseCommandLine(input);
    } catch (error) {
      this.pushFailure(state, null, input.trim(), error);
      return { state, ok: false };
    }

    const announce = depth > 0 || segments.length > 1;
    const standalone = depth === 0 && segments.length === 1;
    let current = state;
    let ok = true;
    let previousOk = true;

    for (const segment of segments) {
      if (segment.connector === "&&" && !previousOk) continue;
      const outcome = this.runSegment(segment, current, depth, announce ? segment.raw : null, standalone);
      current = outcome.state;
      previousOk = outcome.ok;
      ok &&= outcome.ok;
    }
    return { state: current, ok };
  }

  private resolve(argv: string[]): Resolution {
    const findCustom = (name: string) => this.customCommands.find((command) => command.name === name);

    if (argv[0] === "git") {
      if (argv.length === 1) return { kind: "builtin", definition: this.registry.lookup("git", "help")!, args: [] };
      const name = argv[1];
      if (name === "--version" || name === "-v" || name === "version") {
        return { kind: "version" };
      }
      const definition = this.registry.lookup("git", name);
      if (definition) return { kind: "builtin", definition, args: argv.slice(2) };
      const custom = findCustom(`git ${name}`);
      if (custom) return { kind: "custom", command: custom, args: argv.slice(2) };
      const aliases = this.customCommands.filter((c) => c.name.startsWith("git ")).map((c) => c.name.slice(4));
      const suggestion = this.registry.suggest("git", name, aliases);
      return {
        kind: "unknown",
        message: `git: '${name}' is not a git command. See 'git help'.`,
        hint: suggestion ? `Did you mean git ${suggestion}?` : "Run git help to see the git commands this simulator knows.",
      };
    }

    const definition = this.registry.lookup("shell", argv[0]);
    if (definition) return { kind: "builtin", definition, args: argv.slice(1) };
    const custom = findCustom(argv[0]);
    if (custom) return { kind: "custom", command: custom, args: argv.slice(1) };
    const topLevel = this.customCommands.filter((c) => !c.name.startsWith("git ")).map((c) => c.name);
    const suggestion = this.registry.suggest("shell", argv[0], [...topLevel, "git"]);
    const looksLikeGit = this.registry.has("git", argv[0]);
    return {
      kind: "unknown",
      message: `command not found: ${argv[0]}`,
      hint: EDITORS.has(argv[0])
        ? "There's no text editor here, and you don't need one — levels come with their file changes already made. Just use git commands."
        : looksLikeGit
        ? `Git commands start with "git" — try git ${argv.join(" ")}`
        : suggestion
          ? `Did you mean ${suggestion}?`
          : "Type help to see everything you can run.",
    };
  }

  private runSegment(segment: CommandSegment, state: RepoState, depth: number, announce: string | null, standalone: boolean): Outcome {
    const resolution = this.resolve(segment.argv);
    switch (resolution.kind) {
      case "version":
        this.frames.push({
          state,
          announce,
          output: [lineOf(`git version ${GIT_VERSION} (GitQuest simulator)`)],
          events: [],
          narration: { icon: "🔧", title: "Git version", body: "Real Git prints the version installed on your computer. Here it tells you the simulator is running." },
          effects: [],
          ok: true,
          completed: { command: segment.raw, ok: true, changed: false },
        });
        return { state, ok: true };
      case "unknown":
        this.frames.push({
          state,
          announce,
          output: errorLines(resolution.message, resolution.hint),
          events: [{ type: "error", message: resolution.message }],
          narration: { icon: "🤔", title: "Unknown command", body: resolution.hint },
          effects: [],
          ok: false,
          completed: { command: segment.raw, ok: false, changed: false },
        });
        return { state, ok: false };
      case "custom":
        return this.runCustom(resolution.command, resolution.args, segment, state, depth, announce);
      case "builtin":
        return this.runBuiltin(resolution.definition, resolution.args, segment, state, announce, standalone);
    }
  }

  private runCustom(
    command: CustomCommand,
    args: string[],
    segment: CommandSegment,
    state: RepoState,
    depth: number,
    announce: string | null,
  ): Outcome {
    let steps: string[];
    try {
      if (depth >= MAX_CUSTOM_DEPTH) {
        throw new CommandError(
          `${command.name}: custom commands are nested too deeply (limit ${MAX_CUSTOM_DEPTH})`,
          "Does this command call itself? Custom commands can use other commands, but not in an endless loop.",
        );
      }
      steps = expandSteps(command, args);
    } catch (error) {
      this.pushFailure(state, announce, segment.raw, error);
      return { state, ok: false };
    }

    this.frames.push({
      state,
      announce,
      output: [{ segments: [seg("⚡ ", "tag"), seg(command.name, "tag", true), seg(` — running ${steps.length} step${steps.length === 1 ? "" : "s"}`, "muted")] }],
      events: [],
      narration: {
        icon: "⚡",
        title: `Custom command: ${command.name}`,
        body: command.description || `Running your recipe: ${steps.join(" → ")}`,
      },
      effects: [],
      ok: true,
      completed: null,
    });

    let current = state;
    for (const step of steps) {
      const outcome = this.runInput(step, current, depth + 1);
      current = outcome.state;
      if (!outcome.ok) return { state: current, ok: false };
    }
    return { state: current, ok: true };
  }

  private runBuiltin(
    definition: CommandDefinition,
    args: string[],
    segment: CommandSegment,
    state: RepoState,
    announce: string | null,
    standalone: boolean,
  ): Outcome {
    const label = commandLabel(definition);
    const hasHelpShort = Object.values(definition.options ?? {}).some((option) => option.short === "h");
    if (args.includes("--help") || (!hasHelpShort && args.includes("-h"))) {
      this.frames.push({
        state,
        announce,
        output: commandHelpLines(definition),
        events: [],
        narration: { icon: "📖", title: label, body: definition.description ?? definition.summary },
        effects: [],
        ok: true,
        completed: { command: segment.raw, ok: true, changed: false },
      });
      return { state, ok: true };
    }

    const draft = cloneState(state);
    const pending: Frame[] = [];
    let output: OutputLine[] = [];
    let events: EngineEvent[] = [];
    let narration: Narration | null = null;
    let effects: Effect[] = [];
    const redirected: string[] = [];

    const takeFrame = (): Frame => {
      const frame: Frame = { state: cloneState(draft), announce: null, output, events, narration, effects, ok: true, completed: null };
      output = [];
      events = [];
      narration = null;
      effects = [];
      return frame;
    };

    const printLine = (line: OutputLine) => {
      if (segment.redirect) redirected.push(plainText(line));
      else output.push(line);
    };

    try {
      const parsed = parseArgs(args, definition.options, label);
      const requiresRepo = definition.requiresRepo ?? definition.program === "git";
      if (requiresRepo && !state.initialized) {
        throw new CommandError(
          "fatal: not a git repository (or any of the parent directories): .git",
          "This folder isn't a Git repository yet. Run git init first.",
        );
      }

      const ctx: CommandContext = {
        state: draft,
        args: parsed,
        argv: segment.argv,
        registry: this.registry,
        customCommands: this.customCommands,
        standalone,
        print: (text = "", tone?: Tone) => {
          for (const part of text.split("\n")) printLine(lineOf(part, tone));
        },
        printSegments: (...segments: Segment[]) => printLine({ segments }),
        emit: (event) => events.push(event),
        narrate: (next) => {
          narration = next;
        },
        effect: (next) => effects.push(next),
        checkpoint: () => pending.push(takeFrame()),
        fail: (message, hint) => {
          throw new CommandError(message, hint);
        },
      };

      definition.run(ctx);

      if (segment.redirect) {
        const { path, mode } = segment.redirect;
        assertValidPath(path);
        const text = redirected.join("\n");
        const existing = own(draft.workdir, path);
        draft.workdir[path] = mode === "append" && existing ? `${existing}\n${text}` : text;
        events.push({ type: "file-written", path, created: existing === undefined });
        narration ??= {
          icon: "✏️",
          title: `${mode === "append" ? "Appended to" : "Wrote"} ${path}`,
          body: draft.initialized
            ? own(draft.index, path) === undefined
              ? "A new file appeared on disk. Git sees it as untracked until you git add it."
              : "The file on disk changed, so it no longer matches the staging area. It shows up as modified."
            : "The file changed on disk. This folder isn't a Git repository yet, so nothing is being tracked.",
        };
      }
    } catch (error) {
      const partial = output;
      this.pushFailure(state, announce, segment.raw, error, partial);
      return { state, ok: false };
    }

    pending.push(takeFrame());
    pending[0].announce = announce;
    pending[pending.length - 1].completed = { command: segment.raw, ok: true, changed: !statesEqual(state, draft) };
    this.frames.push(...pending);
    return { state: draft, ok: true };
  }

  private pushFailure(state: RepoState, announce: string | null, command: string, error: unknown, partial: OutputLine[] = []) {
    const known = error instanceof CommandError;
    const message = known ? error.message : `simulator error: ${error instanceof Error ? error.message : String(error)}`;
    const hint = known ? error.hint : "Something went wrong inside the simulator. Try a different command or undo.";
    if (!known) console.error(error);
    this.frames.push({
      state,
      announce,
      output: [...partial, ...errorLines(message, hint)],
      events: [{ type: "error", message }],
      narration: { icon: "🙅", title: "Git said no", body: hint ?? "Read the red message in the terminal — Git usually explains what went wrong." },
      effects: [],
      ok: false,
      completed: { command, ok: false, changed: false },
    });
  }
}

export function execute(registry: CommandRegistry, input: string, state: RepoState, options: ExecuteOptions = {}): ExecutionResult {
  const execution = new Execution(registry, options.customCommands ?? []);
  const outcome = execution.runInput(input, state, 0);
  return { frames: execution.frames, state: outcome.state, ok: outcome.ok };
}
