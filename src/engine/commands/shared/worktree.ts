import { refsAt, shortId } from "../../core/refs";
import { getCommit, headCommitId, headTree, recordReflog } from "../../core/repo";
import { diffTrees } from "../../core/tree";
import type { FileTree, RepoState } from "../../core/types";
import { own } from "../../core/utils";
import type { CommandContext } from "../types";

/** Tracked paths with local changes that moving to `target` would overwrite. */
export function pathsBlockingCheckout(state: RepoState, target: FileTree): string[] {
  const current = headTree(state);
  return diffTrees(current, target)
    .map((change) => change.path)
    .filter((path) => {
      const committed = own(current, path);
      const staged = own(state.index, path);
      const disk = own(state.workdir, path);
      return staged !== committed || disk !== staged;
    });
}

/** Updates the staging area and working directory for every path that differs between two snapshots. */
export function applySnapshotChange(state: RepoState, from: FileTree, to: FileTree): void {
  for (const { path } of diffTrees(from, to)) {
    const content = own(to, path);
    if (content === undefined) {
      delete state.index[path];
      delete state.workdir[path];
    } else {
      state.index[path] = content;
      state.workdir[path] = content;
    }
  }
}

/** Checks out a commit's files, refusing to clobber local changes (like real Git). */
export function checkoutFiles(ctx: CommandContext, targetId: string, verb: string): void {
  const target = getCommit(ctx.state, targetId).tree;
  const blocked = pathsBlockingCheckout(ctx.state, target);
  if (blocked.length > 0) {
    ctx.fail(
      `error: Your local changes to the following files would be overwritten by ${verb}:\n${blocked
        .map((path) => `\t${path}`)
        .join("\n")}\nPlease commit your changes or stash them before you switch branches.\nAborting`,
      "Git protects your unsaved work. Commit it (git add + git commit) or throw it away (git restore <file>) first.",
    );
  }
  applySnapshotChange(ctx.state, headTree(ctx.state), target);
}

function headDescription(state: RepoState): string {
  if (state.head.kind === "branch") return state.head.name;
  return shortId(state.head.commit);
}

export function switchToBranch(ctx: CommandContext, name: string, verb: string): void {
  const state = ctx.state;
  const target = state.branches[name];
  const fromId = headCommitId(state);
  const fromLabel = headDescription(state);
  checkoutFiles(ctx, target, verb);
  state.head = { kind: "branch", name };
  recordReflog(state, target, `${verb}: moving from ${fromLabel} to ${name}`);
  ctx.emit({ type: "head-moved", from: fromId, to: target, branch: name });
}

export function detachHeadAt(ctx: CommandContext, commitId: string, verb: string, label: string): void {
  const state = ctx.state;
  const fromId = headCommitId(state);
  const fromLabel = headDescription(state);
  checkoutFiles(ctx, commitId, verb);
  state.head = { kind: "detached", commit: commitId };
  recordReflog(state, commitId, `${verb}: moving from ${fromLabel} to ${label}`);
  ctx.emit({ type: "head-moved", from: fromId, to: commitId, branch: null });
}

export function narrateDetached(ctx: CommandContext, commitId: string): void {
  const refs = refsAt(ctx.state, commitId);
  const alsoOn = refs.branches.length > 0 ? ` It's the same commit that ${refs.branches.join(", ")} points to, but` : "";
  ctx.narrate({
    icon: "🛸",
    title: "Detached HEAD — you're time travelling",
    body: `HEAD now points straight at commit ${shortId(commitId)} instead of a branch.${alsoOn} new commits made here won't belong to any branch. Look around freely, then git switch back to a branch (or create one with git switch -c).`,
  });
}

/**
 * `git switch design` / `git checkout design` when only `origin/design` exists: create a local branch from the
 * remote-tracking one, link them, and switch to it — real Git's shortcut for joining a teammate's branch.
 */
export function trackRemoteBranch(ctx: CommandContext, name: string, verb: string): boolean {
  const state = ctx.state;
  const matches = Object.keys(state.remoteRefs).filter((ref) => ref.split("/").slice(1).join("/") === name);
  if (matches.length !== 1) return false;

  const [upstream] = matches;
  const id = state.remoteRefs[upstream];
  const fromId = headCommitId(state);
  checkoutFiles(ctx, id, verb);
  state.branches[name] = id;
  state.upstreams[name] = upstream;
  state.head = { kind: "branch", name };
  recordReflog(state, id, `${verb}: moving to new branch ${name}`);
  ctx.print(`branch '${name}' set up to track '${upstream}'.`);
  ctx.print(`Switched to a new branch '${name}'`);
  ctx.emit({ type: "branch-created", name, at: id });
  ctx.emit({ type: "head-moved", from: fromId, to: id, branch: name });
  ctx.narrate({
    icon: "🌿",
    title: `Created '${name}' from ${upstream}`,
    body: `There was no local '${name}', but ${upstream} exists, so Git made a local branch that tracks it and switched to it.`,
  });
  return true;
}
