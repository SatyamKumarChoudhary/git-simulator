import { commitsToReplay, isAncestor } from "../../core/graph";
import { resolveRevision, shortId } from "../../core/refs";
import { createCommit, firstParentTree, getCommit, headTree, moveHead, recordReflog } from "../../core/repo";
import { mergeTrees, treesEqual } from "../../core/tree";
import type { Commit, FileTree } from "../../core/types";
import { pluralize } from "../../core/utils";
import { printCommitSummary } from "../shared/format";
import { requireCleanTrackedFiles, requireHeadCommit, requireNoMerge } from "../shared/guards";
import { applySnapshotChange, checkoutFiles } from "../shared/worktree";
import { type CommandContext, defineCommand } from "../types";

function assertNotMerge(ctx: CommandContext, commit: Commit, verb: string) {
  if (commit.parents.length > 1) {
    ctx.fail(
      `error: commit ${shortId(commit.id)} is a merge but no -m option was given.\nfatal: ${verb} failed`,
      `The simulator can't ${verb} merge commits yet. Pick a regular commit.`,
    );
  }
}

/** Replays the change a commit introduced on top of `onto`. Fails on conflicts. */
function replayTree(ctx: CommandContext, commit: Commit, onto: FileTree, verb: string): FileTree {
  const result = mergeTrees(firstParentTree(ctx.state, commit), onto, commit.tree, {
    ours: "HEAD",
    theirs: `${shortId(commit.id)} (${commit.message})`,
  });
  if (result.conflicts.length > 0) {
    ctx.fail(
      `${result.conflicts.map((path) => `CONFLICT (content): Merge conflict in ${path}`).join("\n")}\nerror: could not apply ${shortId(commit.id)}... ${commit.message}`,
      `Replaying "${commit.message}" clashes with changes already on this branch. The simulator doesn't support ${verb} conflicts yet — git merge can handle this situation instead.`,
    );
  }
  return result.tree;
}

export const cherryPickCommand = defineCommand({
  program: "git",
  name: "cherry-pick",
  category: "rewrite",
  summary: "Copy specific commits onto the current branch",
  usage: ["git cherry-pick <commit>...", ],
  description: "Takes the change a commit introduced and re-applies it here as a brand-new commit.",
  examples: ["git cherry-pick a1b2c3d", "git cherry-pick experiment~1"],
  run(ctx: CommandContext) {
    const state = ctx.state;
    requireNoMerge(ctx, "Cherry-picking");
    requireHeadCommit(ctx);
    requireCleanTrackedFiles(ctx, "cherry-pick");
    const revisions = ctx.args.positionals;
    if (revisions.length === 0) ctx.fail("fatal: empty commit set passed", "Name the commit to copy: git cherry-pick <commit>");

    const picked = revisions.map((revision) => getCommit(state, resolveRevision(state, revision)));
    const copies: string[] = [];
    picked.forEach((original, i) => {
      assertNotMerge(ctx, original, "cherry-pick");
      const before = headTree(state);
      const tree = replayTree(ctx, original, before, "cherry-pick");
      if (treesEqual(tree, before)) {
        ctx.fail(
          `The previous cherry-pick is now empty, possibly due to conflict resolution.`,
          `The changes from ${shortId(original.id)} are already on this branch — nothing to copy.`,
        );
      }
      const copy = createCommit(state, { message: original.message, parents: [requireHeadCommit(ctx)], tree, copiedFrom: original.id });
      applySnapshotChange(state, before, tree);
      moveHead(state, copy.id, `cherry-pick: ${original.message}`);
      printCommitSummary(ctx, copy, before);
      ctx.emit({ type: "commit", id: copy.id, kind: "cherry-pick" });
      copies.push(copy.id);
      if (i < picked.length - 1) ctx.checkpoint();
    });

    ctx.narrate({
      icon: "🍒",
      title: `Cherry-picked ${pluralize(copies.length, "commit")}`,
      body: `Git copied the changes from ${picked.map((commit) => shortId(commit.id)).join(", ")} into new commit${copies.length === 1 ? "" : "s"} ${copies.map(shortId).join(", ")}. Same message and changes, different parent — so a different hash. The originals are untouched.`,
    });
  },
});

export const revertCommand = defineCommand({
  program: "git",
  name: "revert",
  category: "undo",
  summary: "Create a new commit that undoes an earlier one",
  usage: ["git revert <commit>"],
  description: "The safe way to undo shared history: nothing is deleted, a new 'opposite' commit is added.",
  examples: ["git revert HEAD", "git revert a1b2c3d"],
  options: {
    noEdit: { long: "no-edit", description: "Use the default message (always on in the simulator)" },
  },
  run(ctx: CommandContext) {
    const state = ctx.state;
    requireNoMerge(ctx, "Reverting");
    const headId = requireHeadCommit(ctx);
    requireCleanTrackedFiles(ctx, "revert");
    const [revision] = ctx.args.positionals;
    if (!revision) ctx.fail("fatal: no commit specified", "Name the commit to undo: git revert <commit>");

    const target = getCommit(state, resolveRevision(state, revision));
    assertNotMerge(ctx, target, "revert");
    const before = headTree(state);
    const result = mergeTrees(target.tree, before, firstParentTree(state, target), {
      ours: "HEAD",
      theirs: `parent of ${shortId(target.id)} (${target.message})`,
    });
    if (result.conflicts.length > 0) {
      ctx.fail(
        `error: could not revert ${shortId(target.id)}... ${target.message}\nCONFLICT (content): Merge conflict in ${result.conflicts.join(", ")}`,
        "Later commits changed the same lines, so the undo can't be applied automatically. The simulator doesn't support revert conflicts yet.",
      );
    }
    if (treesEqual(result.tree, before)) {
      ctx.fail("nothing to commit, working tree clean", `The changes from ${shortId(target.id)} are already gone.`);
    }

    const commit = createCommit(state, { message: `Revert "${target.message}"`, parents: [headId], tree: result.tree });
    applySnapshotChange(state, before, result.tree);
    moveHead(state, commit.id, `revert: Revert "${target.message}"`);
    printCommitSummary(ctx, commit, before);
    ctx.emit({ type: "commit", id: commit.id, kind: "revert" });
    ctx.narrate({
      icon: "🔄",
      title: `Reverted ${shortId(target.id)}`,
      body: `New commit ${shortId(commit.id)} does the exact opposite of "${target.message}". History only grows — nothing was erased, which is why revert is safe on branches other people use.`,
    });
  },
});

export const rebaseCommand = defineCommand({
  program: "git",
  name: "rebase",
  category: "rewrite",
  summary: "Replay your commits on top of another branch",
  usage: ["git rebase <branch>"],
  description: "Moves the commits unique to your branch so they start from the tip of <branch>, creating a straight-line history.",
  examples: ["git rebase main"],
  run(ctx: CommandContext) {
    const state = ctx.state;
    requireNoMerge(ctx, "Rebasing");
    const headId = requireHeadCommit(ctx);
    requireCleanTrackedFiles(ctx, "rebase");
    const [upstreamName] = ctx.args.positionals;
    if (!upstreamName) ctx.fail("fatal: no upstream configured", "Say what to rebase onto: git rebase <branch>");

    const upstream = resolveRevision(state, upstreamName);
    const branch = state.head.kind === "branch" ? state.head.name : null;
    const label = branch ?? "HEAD";

    if (isAncestor(state, upstream, headId)) {
      ctx.print(`Current branch ${label} is up to date.`);
      ctx.narrate({ icon: "✅", title: "Already up to date", body: `${label} already contains everything in ${upstreamName}, so there's nothing to replay.` });
      return;
    }

    if (isAncestor(state, headId, upstream)) {
      checkoutFiles(ctx, upstream, "rebase");
      moveHead(state, upstream, `rebase (finish): ${label} onto ${shortId(upstream)}`);
      ctx.print(`Successfully rebased and updated refs/heads/${label}.`, "success");
      ctx.emit({ type: "fast-forward", ref: label, from: headId, to: upstream });
      ctx.narrate({ icon: "⏩", title: "Fast-forwarded", body: `${label} had no commits of its own, so it simply moved up to ${upstreamName}.` });
      return;
    }

    const toReplay = commitsToReplay(state, headId, upstream);
    const startTree = headTree(state);
    let onto = upstream;
    let ontoTree = getCommit(state, upstream).tree;

    // Git detaches HEAD while it replays, then moves the branch at the end.
    state.head = { kind: "detached", commit: upstream };
    applySnapshotChange(state, startTree, ontoTree);
    recordReflog(state, upstream, `rebase (start): checkout ${upstreamName}`);
    ctx.emit({ type: "head-moved", from: headId, to: upstream, branch: null });
    ctx.narrate({
      icon: "🪜",
      title: `Rebasing ${label} onto ${upstreamName}`,
      body: `Step 1: Git detaches HEAD at the tip of ${upstreamName}. Next it will replay ${pluralize(toReplay.length, "commit")} from ${label} on top, one at a time.`,
    });
    ctx.checkpoint();

    const copies: string[] = [];
    for (const original of toReplay) {
      const tree = replayTree(ctx, original, ontoTree, "rebase");
      if (treesEqual(tree, ontoTree)) continue; // already applied upstream
      const copy = createCommit(state, { message: original.message, parents: [onto], tree, copiedFrom: original.id });
      applySnapshotChange(state, ontoTree, tree);
      state.head = { kind: "detached", commit: copy.id };
      recordReflog(state, copy.id, `rebase (pick): ${original.message}`);
      ctx.print(`Applying: ${original.message}`, "muted");
      ctx.emit({ type: "commit", id: copy.id, kind: "rebase" });
      ctx.narrate({
        icon: "🧬",
        title: `Replayed “${original.message}”`,
        body: `Git re-applied the changes from ${shortId(original.id)} on top of ${shortId(onto)}, creating the copy ${shortId(copy.id)}. Same change, new parent — so it gets a new hash.`,
      });
      copies.push(copy.id);
      onto = copy.id;
      ontoTree = tree;
      ctx.checkpoint();
    }

    if (branch) {
      state.branches[branch] = onto;
      state.head = { kind: "branch", name: branch };
      recordReflog(state, onto, `rebase (finish): returning to refs/heads/${branch}`);
    }
    ctx.print(`Successfully rebased and updated refs/heads/${label}.`, "success");
    ctx.emit({ type: "rebased", branch, from: headId, to: onto });
    ctx.narrate({
      icon: "🪜",
      title: `Rebased ${pluralize(copies.length, "commit")} onto ${upstreamName}`,
      body: `Git replayed your commits one by one on top of ${upstreamName}, creating new copies (${copies.map(shortId).join(", ")}). ${label} now points at the last copy and history is a straight line. The faded originals are no longer on any branch.`,
    });
  },
});

export const reflogCommand = defineCommand({
  program: "git",
  name: "reflog",
  category: "undo",
  summary: "Show everywhere HEAD has been — your safety net",
  usage: ["git reflog"],
  description: "Even 'lost' commits after a reset appear here, so you can get them back.",
  examples: ["git reflog", "git reset --hard HEAD@{1}"],
  run(ctx: CommandContext) {
    const entries = ctx.state.reflog;
    if (entries.length === 0) ctx.print("(the reflog is empty — make a commit first)", "muted");
    entries.forEach((entry, i) => {
      ctx.printSegments(
        { text: shortId(entry.commit), tone: "hash" },
        { text: ` HEAD@{${i}}: `, tone: "muted" },
        { text: entry.action },
      );
    });
    ctx.narrate({
      icon: "🧭",
      title: "The reflog remembers",
      body: "Every time HEAD moves, Git writes it down here. If you ever 'lose' commits with reset, find their hash in this list and git reset --hard <hash> to get them back.",
    });
  },
});
