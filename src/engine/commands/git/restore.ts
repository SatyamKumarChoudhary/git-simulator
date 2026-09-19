import { resolveRevision } from "../../core/refs";
import { getCommit, headTree } from "../../core/repo";
import type { FileTree } from "../../core/types";
import { own } from "../../core/utils";
import { flag, optionValue } from "../../parser/args";
import { sideOption, takeConflictSide } from "../shared/conflicts";
import { expandPathspecs } from "../shared/paths";
import { type CommandContext, defineCommand } from "../types";

/** Resets the staging-area copy of each path back to `source` (default HEAD). Returns changed paths. */
export function unstagePaths(ctx: CommandContext, paths: readonly string[], source: FileTree): string[] {
  const state = ctx.state;
  const changed: string[] = [];
  for (const path of paths) {
    const target = own(source, path);
    if (own(state.index, path) === target) continue;
    if (target === undefined) delete state.index[path];
    else state.index[path] = target;
    changed.push(path);
  }
  return changed;
}

export const restoreCommand = defineCommand({
  program: "git",
  name: "restore",
  category: "undo",
  summary: "Discard changes or unstage files",
  usage: ["git restore <file>...", "git restore --staged <file>...", "git restore --source <commit> <file>"],
  description: "Without --staged: overwrite the file on disk with the staged version (your edits are lost!). With --staged: take the file out of the staging area, keeping your edits.",
  examples: ["git restore notes.txt", "git restore --staged secrets.txt", "git restore --source HEAD~1 app.js"],
  options: {
    staged: { short: "S", long: "staged", description: "Restore the staging area (unstage)" },
    worktree: { short: "W", long: "worktree", description: "Restore the working directory (default)" },
    source: { short: "s", long: "source", takesValue: true, valueName: "commit", description: "Take the content from this commit" },
    ours: { long: "ours", description: "During a merge conflict: keep your branch's version" },
    theirs: { long: "theirs", description: "During a merge conflict: take the merged branch's version" },
  },
  run(ctx: CommandContext) {
    const state = ctx.state;
    const specs = [...ctx.args.positionals, ...(ctx.args.paths ?? [])];
    if (specs.length === 0) ctx.fail("fatal: you must specify path(s) to restore", "Name the file(s): git restore <file>");
    const side = sideOption(ctx);
    if (side) return takeConflictSide(ctx, side, specs);

    const staged = flag(ctx.args, "staged");
    const worktree = flag(ctx.args, "worktree") || !staged;
    const sourceRevision = optionValue(ctx.args, "source");
    const committed = sourceRevision ? getCommit(state, resolveRevision(state, sourceRevision)).tree : headTree(state);

    const known = [...Object.keys(state.index), ...Object.keys(committed), ...(staged ? [] : Object.keys(state.workdir))];
    const { matched, unmatched } = expandPathspecs(specs, known);
    if (unmatched.length > 0) {
      ctx.fail(
        `error: pathspec '${unmatched[0]}' did not match any file(s) known to git`,
        `Git doesn't track '${unmatched[0]}' yet, so there's no saved version to restore.`,
      );
    }

    const unstaged = staged ? unstagePaths(ctx, matched, committed) : [];
    const discarded: string[] = [];

    if (worktree) {
      const source = staged || sourceRevision ? committed : state.index;
      for (const path of matched) {
        const tracked = own(state.index, path) !== undefined || own(committed, path) !== undefined;
        if (!tracked) continue; // untracked files are never touched by restore
        const target = own(source, path);
        if (own(state.workdir, path) === target) continue;
        if (target === undefined) delete state.workdir[path];
        else state.workdir[path] = target;
        discarded.push(path);
      }
    }

    if (unstaged.length > 0) ctx.emit({ type: "unstaged", paths: unstaged });
    if (discarded.length > 0) ctx.emit({ type: "discarded", paths: discarded });

    if (unstaged.length === 0 && discarded.length === 0) {
      ctx.narrate({ icon: "🤷", title: "Nothing to restore", body: "Those files already match, so nothing changed." });
      return;
    }
    ctx.narrate(
      worktree
        ? {
            icon: "🧽",
            title: "Changes discarded",
            body: `${discarded.join(", ")} ${discarded.length === 1 ? "was" : "were"} overwritten with the ${
              sourceRevision ? `version from ${sourceRevision}` : staged ? "last committed version" : "staged version"
            }. Careful: discarded edits are gone for good.`,
          }
        : {
            icon: "↩️",
            title: "Unstaged",
            body: `${unstaged.join(", ")} left the staging area and won't be in the next commit. Your edits are still safe in the working directory.`,
          },
    );
  },
});
