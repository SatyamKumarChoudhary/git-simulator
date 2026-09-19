import {
  DEFAULT_AUTHOR_EMAIL,
  DEFAULT_AUTHOR_NAME,
  DEFAULT_BRANCH,
  MAX_REFLOG_ENTRIES,
} from "./constants";
import { CommandError } from "./errors";
import type { Commit, FileTree, RepoState } from "./types";
import { hashString, own } from "./utils";

export function createRepoState(): RepoState {
  return {
    initialized: false,
    commits: {},
    branches: {},
    tags: {},
    head: { kind: "branch", name: DEFAULT_BRANCH },
    index: {},
    workdir: {},
    merge: null,
    reflog: [],
    config: {},
    stash: [],
    remotes: {},
    remoteRefs: {},
    upstreams: {},
    servers: {},
    clock: 0,
  };
}

export function cloneState(state: RepoState): RepoState {
  return structuredClone(state);
}

export function statesEqual(a: RepoState, b: RepoState): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function currentBranch(state: RepoState): string | null {
  return state.head.kind === "branch" ? state.head.name : null;
}

export function headCommitId(state: RepoState): string | null {
  if (state.head.kind === "detached") return state.head.commit;
  return own(state.branches, state.head.name) ?? null;
}

/** True when HEAD points at a branch that has no commits yet. */
export function isUnborn(state: RepoState): boolean {
  return headCommitId(state) === null;
}

export function getCommit(state: RepoState, id: string): Commit {
  const commit = own(state.commits, id);
  if (!commit) throw new CommandError(`fatal: bad object ${id}`);
  return commit;
}

export function headTree(state: RepoState): FileTree {
  const id = headCommitId(state);
  return id ? getCommit(state, id).tree : {};
}

export function firstParentTree(state: RepoState, commit: Commit): FileTree {
  const parent = commit.parents[0];
  return parent ? getCommit(state, parent).tree : {};
}

export function recordReflog(state: RepoState, commit: string, action: string): void {
  state.reflog.unshift({ commit, action });
  if (state.reflog.length > MAX_REFLOG_ENTRIES) state.reflog.length = MAX_REFLOG_ENTRIES;
}

/** Moves whatever HEAD points at (the current branch, or HEAD itself when detached). */
export function moveHead(state: RepoState, commitId: string, action: string): void {
  if (state.head.kind === "branch") state.branches[state.head.name] = commitId;
  else state.head = { kind: "detached", commit: commitId };
  recordReflog(state, commitId, action);
}

export function authorOf(state: RepoState): string {
  const name = own(state.config, "user.name") ?? DEFAULT_AUTHOR_NAME;
  const email = own(state.config, "user.email") ?? DEFAULT_AUTHOR_EMAIL;
  return `${name} <${email}>`;
}

export interface NewCommit {
  message: string;
  parents: string[];
  tree: FileTree;
  copiedFrom?: string;
  author?: string;
}

/** Creates a commit in `store` (the local object database unless a hosted repo's is given). */
export function createCommit(state: RepoState, input: NewCommit, store: Record<string, Commit> = state.commits): Commit {
  state.clock += 1;
  const seed = `${state.clock}|${input.message}|${input.parents.join(",")}|${JSON.stringify(input.tree)}`;
  let id = hashString(seed).slice(0, 7);
  for (let salt = 1; Object.hasOwn(state.commits, id) || Object.hasOwn(store, id); salt++) {
    id = hashString(`${seed}#${salt}`).slice(0, 7);
  }
  const commit: Commit = {
    id,
    message: input.message,
    parents: [...input.parents],
    tree: { ...input.tree },
    author: input.author ?? authorOf(state),
    order: state.clock,
    ...(input.copiedFrom ? { copiedFrom: input.copiedFrom } : {}),
  };
  store[id] = commit;
  return commit;
}
