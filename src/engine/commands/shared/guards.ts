import { currentBranch, headCommitId } from "../../core/repo";
import { computeStatus } from "../../core/tree";
import type { CommandContext } from "../types";

/** Returns HEAD's commit id, or fails when the branch has no commits yet. */
export function requireHeadCommit(ctx: CommandContext): string {
  const id = headCommitId(ctx.state);
  if (!id) {
    ctx.fail(
      `fatal: your current branch '${currentBranch(ctx.state)}' does not have any commits yet`,
      "Make your first commit with git add + git commit before doing this.",
    );
  }
  return id;
}

export function requireNoMerge(ctx: CommandContext, action: string): void {
  const merge = ctx.state.merge;
  if (!merge) return;
  if (merge.conflicts.length > 0) {
    ctx.fail(
      `error: ${action} is not possible because you have unmerged files.`,
      `Finish the merge first: fix ${merge.conflicts.join(", ")}, git add the file(s), then git commit. Or give up with git merge --abort.`,
    );
  }
  ctx.fail(
    "fatal: You have not concluded your merge (MERGE_HEAD exists).",
    "All conflicts are resolved — run git commit to finish the merge (or git merge --abort).",
  );
}

/** Fails when there are staged or unstaged changes to tracked files. */
export function requireCleanTrackedFiles(ctx: CommandContext, action: string): void {
  const status = computeStatus(ctx.state);
  const dirty = [...status.staged, ...status.unstaged].map((change) => change.path);
  if (dirty.length === 0) return;
  ctx.fail(
    `error: cannot ${action}: You have uncommitted changes.\n${[...new Set(dirty)].map((p) => `\t${p}`).join("\n")}`,
    `Commit your changes (git add + git commit) or discard them (git restore <file>) before you ${action}.`,
  );
}
