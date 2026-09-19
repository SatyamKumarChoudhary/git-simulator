import { createDefaultRegistry } from "./commands";
import type { CommandRegistry } from "./commands/registry";
import type { CustomCommand } from "./commands/types";
import { createRepoState } from "./core/repo";
import type { RepoState } from "./core/types";
import { type Completion, complete } from "./runtime/complete";
import { type ExecuteOptions, type ExecutionResult, execute } from "./runtime/executor";

/**
 * The public face of the simulator. Pure and synchronous: give it a repository
 * state and some input, get back animation frames and the resulting state.
 */
export class GitEngine {
  constructor(readonly registry: CommandRegistry = createDefaultRegistry()) {}

  execute(input: string, state: RepoState, options?: ExecuteOptions): ExecutionResult {
    return execute(this.registry, input, state, options);
  }

  complete(input: string, state: RepoState, customCommands?: readonly CustomCommand[]): Completion {
    return complete(input, state, this.registry, customCommands);
  }

  /** Runs setup commands from an empty folder. Throws if any of them fail. */
  build(script: readonly string[], options?: ExecuteOptions): RepoState {
    let state = createRepoState();
    for (const line of script) {
      const result = this.execute(line, state, options);
      if (!result.ok) {
        const failure = result.frames.find((frame) => !frame.ok);
        const text = failure?.output.map((l) => l.segments.map((s) => s.text).join("")).join("\n");
        throw new Error(`Setup command failed: ${line}\n${text}`);
      }
      state = result.state;
    }
    return state;
  }
}

export const engine = new GitEngine();

export type { CommandDefinition, CommandCategory, CustomCommand, OptionDefinition } from "./commands/types";
export { COMMAND_CATEGORIES, commandLabel, defineCommand } from "./commands/types";
export { CommandRegistry } from "./commands/registry";
export type { Commit, FileTree, Head, MergeState, RepoState } from "./core/types";
export type { EngineEvent, Narration, Effect, CommitKind } from "./runtime/events";
export type { OutputLine, Segment, Tone } from "./runtime/output";
export type { Frame, ExecutionResult } from "./runtime/executor";
export type { Completion } from "./runtime/complete";
export { createRepoState, cloneState, currentBranch, headCommitId, headTree, statesEqual } from "./core/repo";
export { computeStatus, diffTrees, type StatusReport, type FileChange } from "./core/tree";
export { ancestors, isAncestor, reachableCommits, mergeBase } from "./core/graph";
export { resolveRevision, tryResolveRevision, shortId, refsAt } from "./core/refs";
export { hasConflictMarkers } from "./core/text";
export { validateCustomCommand, requiredArgumentCount, expandSteps } from "./runtime/custom-commands";
export { contentKey } from "./core/content-key";
