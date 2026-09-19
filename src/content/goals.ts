import {
  type RepoState,
  ancestors,
  computeStatus,
  diffTrees,
  hasConflictMarkers,
  headCommitId,
  headTree,
  isAncestor,
} from "@/engine";

import type { Goal, GoalContext } from "./types";

const has = (record: Record<string, unknown>, key: string) => Object.hasOwn(record, key);

/**
 * Small, composable goal builders. Levels combine these into checklists that
 * are re-evaluated live after every animation frame.
 */

const tipOf = (state: RepoState, branch: string): string | undefined =>
  Object.hasOwn(state.branches, branch) ? state.branches[branch] : undefined;

const messagesOn = (state: RepoState, branch: string): string[] => {
  const tip = tipOf(state, branch);
  return tip ? [...ancestors(state, tip)].map((id) => state.commits[id].message) : [];
};

const normalize = (command: string) => command.trim().replace(/\s+/g, " ");

export function goal(id: string, label: string, check: Goal["check"], sticky = false): Goal {
  return { id, label, check, sticky };
}

export const goals = {
  initialized: (label = "Turn the folder into a repository") => goal("initialized", label, ({ state }) => state.initialized),

  ranCommand: (prefix: string, label: string) =>
    goal(`ran:${prefix}`, label, ({ commands }) => commands.some((command) => normalize(command).startsWith(prefix)), true),

  staged: (path: string, label = `Stage ${path}`) =>
    goal(`staged:${path}`, label, ({ state }) => state.initialized && computeStatus(state).staged.some((change) => change.path === path)),

  untrackedOnDisk: (path: string, label = `Keep ${path} out of the staging area`) =>
    goal(`untracked:${path}`, label, ({ state }) => state.initialized && computeStatus(state).untracked.includes(path)),

  committedFile: (path: string, label = `${path} is saved in a commit`) =>
    goal(`committed:${path}`, label, ({ state }) => Object.hasOwn(headTree(state), path)),

  absentFromHead: (path: string, label = `${path} is gone from the latest commit`) =>
    goal(`absent:${path}`, label, ({ state }) => state.initialized && headCommitId(state) !== null && !Object.hasOwn(headTree(state), path)),

  cleanTree: (label = "Leave a clean working tree (nothing uncommitted)") =>
    goal("clean", label, ({ state }) => {
      if (!state.initialized || state.merge) return false;
      const status = computeStatus(state);
      return status.staged.length + status.unstaged.length + status.untracked.length === 0;
    }),

  commitCount: (count: number, label: string) =>
    goal(`count:${count}`, label, ({ state }) => {
      const head = headCommitId(state);
      return head !== null && ancestors(state, head).size >= count;
    }),

  exactCommitCount: (branch: string, count: number, label: string) =>
    goal(`exact:${branch}:${count}`, label, ({ state }) => {
      const tip = tipOf(state, branch);
      return tip !== undefined && ancestors(state, tip).size === count;
    }),

  /** A commit made during the level whose changes touch exactly these files. */
  focusedCommit: (paths: string[], label: string) =>
    goal(`focused:${paths.join(",")}`, label, ({ state, initial }) => {
      const head = headCommitId(state);
      if (!head) return false;
      const wanted = [...paths].sort().join(",");
      return [...ancestors(state, head)].some((id) => {
        if (Object.hasOwn(initial.commits, id)) return false;
        const commit = state.commits[id];
        const parent = commit.parents[0] ? state.commits[commit.parents[0]].tree : {};
        return diffTrees(parent, commit.tree).map((change) => change.path).sort().join(",") === wanted;
      });
    }),

  branchExists: (name: string, label = `Create a branch called ${name}`) =>
    goal(`branch:${name}`, label, ({ state }) => tipOf(state, name) !== undefined),

  onBranch: (name: string, label = `Be on the ${name} branch (HEAD → ${name})`) =>
    goal(`on:${name}`, label, ({ state }) => state.head.kind === "branch" && state.head.name === name),

  newCommitsOn: (branch: string, count: number, label: string) =>
    goal(`new:${branch}:${count}`, label, ({ state, initial }) => {
      const tip = tipOf(state, branch);
      if (!tip) return false;
      const before = tipOf(initial, branch);
      const old = before ? ancestors(initial, before) : new Set<string>();
      return [...ancestors(state, tip)].filter((id) => !old.has(id)).length >= count;
    }),

  diverged: (a: string, b: string, label: string) =>
    goal(`diverged:${a}:${b}`, label, ({ state }) => {
      const ta = tipOf(state, a);
      const tb = tipOf(state, b);
      return !!ta && !!tb && !isAncestor(state, ta, tb) && !isAncestor(state, tb, ta);
    }),

  includes: (branch: string, other: string, label: string) =>
    goal(`includes:${branch}:${other}`, label, ({ state, initial }) => {
      const tip = tipOf(state, branch);
      const otherTip = tipOf(initial, other) ?? tipOf(state, other);
      return !!tip && !!otherTip && isAncestor(state, otherTip, tip);
    }),

  /** `upstream`'s current tip is an ancestor of `branch` (e.g. after a rebase). */
  basedOn: (branch: string, upstream: string, label: string) =>
    goal(`based:${branch}:${upstream}`, label, ({ state }) => {
      const tip = tipOf(state, branch);
      const base = tipOf(state, upstream);
      return !!tip && !!base && tip !== base && isAncestor(state, base, tip);
    }),

  mergeCommitAt: (branch: string, label: string) =>
    goal(`merge:${branch}`, label, ({ state }) => {
      const tip = tipOf(state, branch);
      return !!tip && state.commits[tip].parents.length === 2;
    }),

  linearHistory: (branch: string, label: string) =>
    goal(`linear:${branch}`, label, ({ state }) => {
      const tip = tipOf(state, branch);
      return !!tip && [...ancestors(state, tip)].every((id) => state.commits[id].parents.length <= 1);
    }),

  unchanged: (branch: string, label: string) =>
    goal(`unchanged:${branch}`, label, ({ state, initial }) => tipOf(state, branch) === tipOf(initial, branch)),

  tipMessage: (branch: string, message: string, label: string) =>
    goal(`tip:${branch}:${message}`, label, ({ state }) => {
      const tip = tipOf(state, branch);
      return !!tip && state.commits[tip].message === message;
    }),

  containsMessage: (branch: string, message: string, label: string) =>
    goal(`contains:${branch}:${message}`, label, ({ state }) => messagesOn(state, branch).includes(message)),

  lacksMessage: (branch: string, message: string, label: string) =>
    goal(`lacks:${branch}:${message}`, label, ({ state }) => tipOf(state, branch) !== undefined && !messagesOn(state, branch).includes(message)),

  configured: (key: string, label: string) => goal(`config:${key}`, label, ({ state }) => Boolean(state.config[key]?.trim())),

  /** The latest commit is new and carries the configured user.name. */
  authoredCommit: (label: string) =>
    goal("authored", label, ({ state, initial }) => {
      const head = headCommitId(state);
      const name = state.config["user.name"];
      return !!head && !!name && !has(initial.commits, head) && state.commits[head].author.startsWith(name);
    }),

  ignoredFile: (path: string, label = `${path} is ignored`) =>
    goal(`ignored:${path}`, label, ({ state }) => state.initialized && computeStatus(state).ignored.includes(path)),

  tagOn: (tag: string, message: string, label: string) =>
    goal(`tag:${tag}`, label, ({ state }) => has(state.tags, tag) && state.commits[state.tags[tag]]?.message === message),

  remoteNamed: (name: string, url: string, label: string) => goal(`remote:${name}`, label, ({ state }) => state.remotes[name] === url),

  /** The hosted repository's branch contains `path` in its latest snapshot. */
  serverHasFile: (url: string, branch: string, path: string, label: string) =>
    goal(`server-file:${branch}:${path}`, label, ({ state }) => {
      const server = state.servers[url];
      const tip = server?.branches[branch];
      return !!tip && has(server.commits[tip].tree, path);
    }),

  /** The hosted branch points at exactly the same commit as the local branch. */
  serverMatches: (url: string, branch: string, label: string) =>
    goal(`server-match:${branch}`, label, ({ state }) => {
      const tip = state.servers[url]?.branches[branch];
      return !!tip && tip === state.branches[branch];
    }),

  upstream: (branch: string, remoteRef: string, label: string) => goal(`upstream:${branch}`, label, ({ state }) => state.upstreams[branch] === remoteRef),

  noConflictMarkers: (path: string, label = `${path} has no conflict markers left`) =>
    goal(`markers:${path}`, label, ({ state }) => Object.hasOwn(state.workdir, path) && !hasConflictMarkers(state.workdir[path])),

  custom: (id: string, label: string, check: (ctx: GoalContext) => boolean, sticky = false) => goal(id, label, check, sticky),
};
