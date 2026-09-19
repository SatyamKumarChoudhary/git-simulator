import { resolveRevision, shortId, tryResolveRevision } from "../../core/refs";
import { firstParentTree, getCommit, headTree } from "../../core/repo";
import { diffLines } from "../../core/text";
import { diffTrees } from "../../core/tree";
import type { FileTree } from "../../core/types";
import { own } from "../../core/utils";
import { flag } from "../../parser/args";
import { seg } from "../../runtime/output";
import { decorationSegments } from "../shared/format";
import { requireHeadCommit } from "../shared/guards";
import { expandPathspecs } from "../shared/paths";
import { type CommandContext, defineCommand } from "../types";

/** Prints a coloured diff between two snapshots. Returns the number of changed files. */
export function printTreeDiff(ctx: CommandContext, from: FileTree, to: FileTree, only?: readonly string[]): number {
  let changes = diffTrees(from, to);
  if (only && only.length > 0) {
    const { matched } = expandPathspecs(only, changes.map((change) => change.path));
    changes = changes.filter((change) => matched.includes(change.path));
  }

  for (const change of changes) {
    ctx.printSegments(seg(`diff --git a/${change.path} b/${change.path}`, "default", true));
    if (change.kind === "added") ctx.print("new file", "muted");
    if (change.kind === "deleted") ctx.print("deleted file", "muted");
    ctx.print(change.kind === "added" ? "--- /dev/null" : `--- a/${change.path}`, "default");
    ctx.print(change.kind === "deleted" ? "+++ /dev/null" : `+++ b/${change.path}`, "default");
    for (const line of diffLines(own(from, change.path), own(to, change.path))) {
      if (line.kind === "add") ctx.print(`+${line.text}`, "added");
      else if (line.kind === "remove") ctx.print(`-${line.text}`, "removed");
      else ctx.print(` ${line.text}`, "muted");
    }
  }
  return changes.length;
}

export const diffCommand = defineCommand({
  program: "git",
  name: "diff",
  category: "inspect",
  summary: "Show line-by-line changes",
  usage: ["git diff", "git diff <file>", "git diff --staged", "git diff <commit> <commit>", "git diff <commit>..<commit>"],
  description: "Without arguments: working directory vs staging area. With --staged: staging area vs last commit.",
  examples: ["git diff", "git diff style.css", "git diff --staged", "git diff HEAD~1 HEAD"],
  options: {
    staged: { long: "staged", description: "Compare the staging area with the last commit" },
    cached: { long: "cached", description: "Same as --staged" },
  },
  run(ctx: CommandContext) {
    const state = ctx.state;
    const staged = flag(ctx.args, "staged") || flag(ctx.args, "cached");
    // `git diff style.css` and `git diff HEAD~1` look the same to the parser: anything that isn't a revision is a path.
    // `git diff HEAD~2..HEAD` is the same as `git diff HEAD~2 HEAD`.
    const expanded = ctx.args.positionals.flatMap((argument) => (/^[^.]+\.\.[^.]+$/.test(argument) ? argument.split("..") : [argument]));
    const revisions = expanded.filter((argument) => tryResolveRevision(state, argument) !== null);
    const pathArguments = expanded.filter((argument) => tryResolveRevision(state, argument) === null);
    const known = new Set([...Object.keys(state.index), ...Object.keys(state.workdir), ...Object.keys(headTree(state))]);
    const unknown = pathArguments.find((path) => !known.has(path) && !path.includes("*") && path !== ".");
    if (unknown) {
      ctx.fail(
        `fatal: ambiguous argument '${unknown}': unknown revision or path not in the working tree.`,
        `There's no commit, branch or file called '${unknown}'.`,
      );
    }
    const allPaths = [...pathArguments, ...(ctx.args.paths ?? [])];
    const paths = allPaths.length > 0 ? allPaths : undefined;
    let description: string;
    let count: number;

    if (revisions.length >= 2) {
      const a = resolveRevision(state, revisions[0]);
      const b = resolveRevision(state, revisions[1]);
      count = printTreeDiff(ctx, getCommit(state, a).tree, getCommit(state, b).tree, paths);
      description = `the snapshots in ${shortId(a)} and ${shortId(b)}`;
    } else if (revisions.length === 1) {
      const a = resolveRevision(state, revisions[0]);
      count = printTreeDiff(ctx, getCommit(state, a).tree, staged ? state.index : trackedWorkdir(ctx), paths);
      description = `commit ${shortId(a)} and your ${staged ? "staging area" : "working directory"}`;
    } else if (staged) {
      count = printTreeDiff(ctx, headTree(state), state.index, paths);
      description = "the last commit and the staging area (what the next commit will change)";
    } else {
      count = printTreeDiff(ctx, state.index, trackedWorkdir(ctx), paths);
      description = "the staging area and your working directory (changes you haven't staged yet)";
    }

    if (count === 0) ctx.print("(no differences)", "muted");
    ctx.narrate({
      icon: "🔬",
      title: count === 0 ? "No differences" : "Comparing snapshots",
      body: `This compares ${description}. Lines starting with + were added, lines with - were removed.`,
    });
  },
});

/** The working directory restricted to files Git tracks (untracked files never appear in git diff). */
function trackedWorkdir(ctx: CommandContext): FileTree {
  const { index, workdir } = ctx.state;
  return Object.fromEntries(Object.keys(index).flatMap((path) => (Object.hasOwn(workdir, path) ? [[path, workdir[path]]] : [])));
}

export const showCommand = defineCommand({
  program: "git",
  name: "show",
  category: "inspect",
  summary: "Show a commit and the changes it introduced",
  usage: ["git show", "git show <commit>"],
  examples: ["git show", "git show HEAD~1"],
  run(ctx: CommandContext) {
    const state = ctx.state;
    const id = ctx.args.positionals[0] ? resolveRevision(state, ctx.args.positionals[0]) : requireHeadCommit(ctx);
    const commit = getCommit(state, id);

    ctx.printSegments(seg(`commit ${commit.id}`, "hash"), ...decorationSegments(state, commit.id));
    if (commit.parents.length > 1) ctx.print(`Merge: ${commit.parents.map(shortId).join(" ")}`);
    ctx.print(`Author: ${commit.author}`);
    ctx.print("");
    ctx.print(`    ${commit.message}`);
    ctx.print("");
    printTreeDiff(ctx, firstParentTree(state, commit), commit.tree);

    ctx.narrate({
      icon: "🧾",
      title: `Inside commit ${shortId(commit.id)}`,
      body: commit.parents.length === 0
        ? "This is a root commit, so everything in it shows up as added."
        : `The diff shows what changed compared to its parent ${shortId(commit.parents[0])}. Commits store full snapshots; diffs are calculated on demand.`,
    });
  },
});
