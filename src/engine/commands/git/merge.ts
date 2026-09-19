import { isAncestor, mergeBase } from "../../core/graph";
import { resolveRevision, shortId } from "../../core/refs";
import { createCommit, getCommit, headTree, moveHead } from "../../core/repo";
import { computeStatus, mergeTrees } from "../../core/tree";
import { own, sortedUnion } from "../../core/utils";
import { flag, optionValue } from "../../parser/args";
import { conflictAdvice } from "../shared/conflicts";
import { printChangeSummary, printCommitSummary } from "../shared/format";
import { requireCleanTrackedFiles, requireHeadCommit } from "../shared/guards";
import { applySnapshotChange } from "../shared/worktree";
import { type CommandContext, defineCommand } from "../types";

function abortMerge(ctx: CommandContext) {
  const state = ctx.state;
  if (!state.merge) ctx.fail("fatal: There is no merge to abort (MERGE_HEAD missing).", "You're not in the middle of a merge.");
  const committed = headTree(state);
  for (const path of sortedUnion(Object.keys(state.index), Object.keys(committed), state.merge.conflicts)) {
    const content = own(committed, path);
    if (content === undefined) {
      delete state.index[path];
      delete state.workdir[path];
    } else {
      state.index[path] = content;
      state.workdir[path] = content;
    }
  }
  state.merge = null;
  ctx.emit({ type: "merge-aborted" });
  ctx.narrate({
    icon: "🛑",
    title: "Merge aborted",
    body: "Everything went back to how it was before you ran git merge. No harm done — try again when you're ready.",
  });
}

export const mergeCommand = defineCommand({
  program: "git",
  name: "merge",
  category: "merging",
  summary: "Combine another branch into the current one",
  usage: ["git merge <branch>", "git merge --no-ff <branch>", "git merge --abort"],
  description: "Fast-forwards when possible; otherwise creates a merge commit with two parents.",
  examples: ["git merge feature", "git merge --no-ff feature", "git merge --abort"],
  options: {
    noFf: { long: "no-ff", description: "Always create a merge commit" },
    abort: { long: "abort", description: "Cancel a merge that has conflicts" },
    message: { short: "m", long: "message", takesValue: true, valueName: "message", description: "Message for the merge commit" },
  },
  run(ctx: CommandContext) {
    const state = ctx.state;
    if (flag(ctx.args, "abort")) return abortMerge(ctx);

    if (state.merge) {
      ctx.fail(
        "fatal: You have not concluded your merge (MERGE_HEAD exists).",
        state.merge.conflicts.length > 0
          ? `Resolve the conflicts in ${state.merge.conflicts.join(", ")} first (git checkout --ours or --theirs, git add, git commit), or run git merge --abort.`
          : "Conflicts are resolved — run git commit to finish the merge.",
      );
    }
    const [targetName] = ctx.args.positionals;
    if (!targetName) ctx.fail("fatal: No remote for the current branch.", "Tell Git what to merge: git merge <branch>");
    const theirs = resolveRevision(state, targetName);
    mergeCommitInto(ctx, targetName, theirs, { noFf: flag(ctx.args, "noFf"), message: optionValue(ctx.args, "message") });
  },
});

export interface MergeOptions {
  noFf?: boolean;
  message?: string;
}

/** Merges `theirs` into HEAD: fast-forward, three-way merge, or a conflict. Shared by git merge and git pull. */
export function mergeCommitInto(ctx: CommandContext, targetName: string, theirs: string, options: MergeOptions = {}): void {
  const state = ctx.state;
  const headId = requireHeadCommit(ctx);
  requireCleanTrackedFiles(ctx, "merge");

  if (theirs === headId || isAncestor(state, theirs, headId)) {
    ctx.print("Already up to date.");
    ctx.narrate({
      icon: "✅",
      title: "Already up to date",
      body: `Every commit in ${targetName} is already part of your current branch, so there's nothing to merge.`,
    });
    return;
  }

  const branchLabel = state.head.kind === "branch" ? state.head.name : "HEAD";
  const theirTree = getCommit(state, theirs).tree;

  if (isAncestor(state, headId, theirs) && !options.noFf) {
    const before = headTree(state);
    applySnapshotChange(state, before, theirTree);
    moveHead(state, theirs, `merge ${targetName}: Fast-forward`);
    ctx.print(`Updating ${shortId(headId)}..${shortId(theirs)}`);
    ctx.print("Fast-forward", "success");
    printChangeSummary(ctx, before, theirTree);
    ctx.emit({ type: "fast-forward", ref: branchLabel, from: headId, to: theirs });
    ctx.narrate({
      icon: "⏩",
      title: "Fast-forward!",
      body: `'${branchLabel}' had no new commits of its own, so Git simply slid the label forward to ${shortId(theirs)}. No merge commit needed — history stays a straight line.`,
    });
    return;
  }

  const base = mergeBase(state, headId, theirs);
  const ours = headTree(state);
  const result = mergeTrees(base ? getCommit(state, base).tree : {}, ours, theirTree, { ours: "HEAD", theirs: targetName });

  for (const path of sortedUnion(Object.keys(ours), Object.keys(result.tree))) {
    const merged = own(result.tree, path);
    if (result.conflicts.includes(path)) {
      state.workdir[path] = merged!;
      continue;
    }
    if (merged === undefined) {
      delete state.index[path];
      delete state.workdir[path];
    } else {
      state.index[path] = merged;
      state.workdir[path] = merged;
    }
  }

  const label = Object.hasOwn(state.branches, targetName) || Object.hasOwn(state.remoteRefs, targetName) ? targetName : shortId(theirs);
  for (const path of sortedUnion(Object.keys(result.tree))) {
    if (own(ours, path) !== own(result.tree, path)) ctx.print(`Auto-merging ${path}`, "muted");
  }

  if (result.conflicts.length > 0) {
    state.merge = { theirs, label, conflicts: result.conflicts };
    for (const path of result.conflicts) ctx.print(`CONFLICT (content): Merge conflict in ${path}`, "error");
    ctx.print("Automatic merge failed; fix conflicts and then commit the result.", "error");
    ctx.emit({ type: "merge-conflict", paths: result.conflicts });
    ctx.narrate({
      icon: "💥",
      title: "Merge conflict!",
      body: `Both branches changed the same lines in ${result.conflicts.join(", ")}, and Git can't guess which version is right. Pick one: ${conflictAdvice(result.conflicts[0])}. Then git add it and git commit.`,
    });
    return;
  }

  const message = options.message ?? `Merge branch '${label}' into ${branchLabel}`;
  const commit = createCommit(state, { message, parents: [headId, theirs], tree: result.tree });
  moveHead(state, commit.id, `merge ${targetName}: Merge made by the 'ort' strategy.`);
  ctx.print("Merge made by the 'ort' strategy.", "success");
  printCommitSummary(ctx, commit, ours);
  ctx.emit({ type: "commit", id: commit.id, kind: "merge" });

  const statusAfter = computeStatus(state);
  ctx.narrate({
    icon: "🔀",
    title: "Three-way merge",
    body: `Both branches had new commits, so Git compared them with their common ancestor ${base ? shortId(base) : "(none)"} and combined the changes into merge commit ${shortId(commit.id)} — a commit with two parents.${
      statusAfter.untracked.length > 0 ? " (Untracked files were left alone.)" : ""
    }`,
  });
}
