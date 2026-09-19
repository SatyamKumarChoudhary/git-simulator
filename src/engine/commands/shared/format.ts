import { shortId, refsAt } from "../../core/refs";
import { diffTrees } from "../../core/tree";
import type { Commit, FileTree, RepoState } from "../../core/types";
import { pluralize } from "../../core/utils";
import { type Segment, seg } from "../../runtime/output";
import type { CommandContext } from "../types";

/** ` (HEAD -> main, tag: v1, feature)` decorations, as coloured segments. */
export function decorationSegments(state: RepoState, id: string): Segment[] {
  const refs = refsAt(state, id);
  const parts: Segment[][] = [];

  if (refs.head && refs.headBranch) parts.push([seg("HEAD -> ", "head", true), seg(refs.headBranch, "branch", true)]);
  else if (refs.head) parts.push([seg("HEAD", "head", true)]);
  for (const tag of refs.tags) parts.push([seg(`tag: ${tag}`, "tag", true)]);
  for (const branch of refs.branches) if (branch !== refs.headBranch) parts.push([seg(branch, "branch", true)]);
  for (const remote of refs.remotes) parts.push([seg(remote, "removed", true)]);

  if (parts.length === 0) return [];
  const out: Segment[] = [seg(" (", "hash")];
  parts.forEach((part, i) => {
    if (i > 0) out.push(seg(", ", "hash"));
    out.push(...part);
  });
  out.push(seg(")", "hash"));
  return out;
}

export function printOneline(ctx: CommandContext, commit: Commit): void {
  ctx.printSegments(seg(shortId(commit.id), "hash"), ...decorationSegments(ctx.state, commit.id), seg(` ${commit.message}`));
}

/** `[main a1b2c3d] message` followed by a change summary, like `git commit` prints. */
export function printCommitSummary(ctx: CommandContext, commit: Commit, before: FileTree, extra = ""): void {
  const state = ctx.state;
  const where = state.head.kind === "branch" ? state.head.name : "detached HEAD";
  ctx.printSegments(
    seg("["),
    seg(where, "branch", true),
    seg(extra ? ` ${extra}` : ""),
    seg(` ${shortId(commit.id)}`, "hash"),
    seg("] "),
    seg(commit.message, "default", true),
  );
  printChangeSummary(ctx, before, commit.tree);
}

export function printChangeSummary(ctx: CommandContext, before: FileTree, after: FileTree): void {
  const changes = diffTrees(before, after);
  if (changes.length === 0) return;
  ctx.print(` ${pluralize(changes.length, "file")} changed`, "muted");
  for (const change of changes) {
    if (change.kind === "added") ctx.print(` create mode 100644 ${change.path}`, "added");
    if (change.kind === "deleted") ctx.print(` delete mode 100644 ${change.path}`, "removed");
  }
}

export function describeCommit(commit: Commit): string {
  return `${shortId(commit.id)} "${commit.message}"`;
}
