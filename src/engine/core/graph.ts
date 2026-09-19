import { headCommitId } from "./repo";
import type { Commit, RepoState } from "./types";
import { own } from "./utils";

/** Every commit reachable from `start` (including `start`) within an object database. */
export function ancestorsIn(commits: Record<string, Commit>, start: string): Set<string> {
  const seen = new Set<string>();
  const stack = [start];
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    const commit = own(commits, id);
    if (!commit) continue;
    seen.add(id);
    stack.push(...commit.parents);
  }
  return seen;
}

/** Every commit reachable from `start` (including `start`). */
export function ancestors(state: RepoState, start: string): Set<string> {
  return ancestorsIn(state.commits, start);
}

export function isAncestor(state: RepoState, ancestor: string, descendant: string): boolean {
  return ancestors(state, descendant).has(ancestor);
}

/** The newest commit that both `a` and `b` descend from. */
export function mergeBase(state: RepoState, a: string, b: string): string | null {
  const fromA = ancestors(state, a);
  let best: Commit | null = null;
  for (const id of ancestors(state, b)) {
    if (!fromA.has(id)) continue;
    const commit = state.commits[id];
    if (!best || commit.order > best.order) best = commit;
  }
  return best?.id ?? null;
}

/** Commit ids that something points at: branches, tags, HEAD and an in-progress merge. */
export function refTips(state: RepoState): string[] {
  const tips = [
    ...Object.values(state.branches),
    ...Object.values(state.tags),
    ...Object.values(state.remoteRefs),
    ...state.stash.map((entry) => entry.base),
  ];
  const head = headCommitId(state);
  if (head) tips.push(head);
  if (state.merge) tips.push(state.merge.theirs);
  return tips;
}

export function reachableCommits(state: RepoState): Set<string> {
  const reachable = new Set<string>();
  for (const tip of refTips(state)) for (const id of ancestors(state, tip)) reachable.add(id);
  return reachable;
}

export function newestFirst(state: RepoState, ids: Iterable<string>): Commit[] {
  return [...ids].map((id) => state.commits[id]).sort((a, b) => b.order - a.order);
}

/** Non-merge commits in `head` that aren't in `upstream`, oldest first — what a rebase replays. */
export function commitsToReplay(state: RepoState, head: string, upstream: string): Commit[] {
  const excluded = ancestors(state, upstream);
  return [...ancestors(state, head)]
    .filter((id) => !excluded.has(id))
    .map((id) => state.commits[id])
    .filter((commit) => commit.parents.length <= 1)
    .sort((a, b) => a.order - b.order);
}
