import { currentBranch, getCommit, headTree } from "../../core/repo";
import { own } from "../../core/utils";
import { flag } from "../../parser/args";
import type { CommandContext } from "../types";
import { expandPathspecs } from "./paths";

export type ConflictSide = "ours" | "theirs";

/** --ours / --theirs, if either was given. */
export function sideOption(ctx: CommandContext): ConflictSide | null {
  if (flag(ctx.args, "ours")) return "ours";
  if (flag(ctx.args, "theirs")) return "theirs";
  return null;
}

/** How to get out of a conflict using only git commands. */
export function conflictAdvice(path: string): string {
  return `keep your version with git checkout --ours ${path}, or take theirs with git checkout --theirs ${path}`;
}

/**
 * Resolves conflicted files by taking one side of the merge: `ours` is the branch you're on, `theirs` is the one
 * being merged in. The conflict markers disappear from the working directory; git add still marks it resolved.
 */
export function takeConflictSide(ctx: CommandContext, side: ConflictSide, specs: readonly string[]): void {
  const state = ctx.state;
  const merge = state.merge;
  if (!merge) ctx.fail(`error: --${side} only works while a merge is in progress`, "There's no merge conflict to resolve right now.");
  if (specs.length === 0) ctx.fail("fatal: you must specify path(s) to check out", `Name the conflicted file: git checkout --${side} <file>`);

  const { matched, unmatched } = expandPathspecs(specs, merge.conflicts);
  if (unmatched.length > 0) {
    ctx.fail(
      `error: path '${unmatched[0]}' does not have a conflict`,
      merge.conflicts.length > 0 ? `Files with conflicts: ${merge.conflicts.join(", ")}` : "Every conflict is resolved — git add the files and git commit.",
    );
  }

  const source = side === "ours" ? headTree(state) : getCommit(state, merge.theirs).tree;
  for (const path of matched) {
    const content = own(source, path);
    if (content === undefined) delete state.workdir[path];
    else state.workdir[path] = content;
  }
  ctx.emit({ type: "discarded", paths: matched });
  ctx.print(`Updated ${matched.length} path${matched.length === 1 ? "" : "s"} from the index`);

  const files = matched.join(", ");
  const whose = side === "ours" ? `your branch${currentBranch(state) ? ` (${currentBranch(state)})` : ""}` : `'${merge.label}'`;
  ctx.narrate({
    icon: side === "ours" ? "✋" : "🤝",
    title: side === "ours" ? "Kept your version" : "Took their version",
    body: `${files} now holds the version from ${whose} — the conflict markers are gone. Mark it resolved with git add ${matched[0]}, then git commit to finish the merge.`,
  });
}
