/** A snapshot of files: path → content. */
export type FileTree = Record<string, string>;

export interface Commit {
  id: string;
  message: string;
  parents: string[];
  tree: FileTree;
  author: string;
  /** Logical creation time — increases by one with every new commit. */
  order: number;
  /** For rewritten commits (amend, cherry-pick, rebase): the commit this one was copied from. */
  copiedFrom?: string;
}

export type Head =
  | { kind: "branch"; name: string }
  | { kind: "detached"; commit: string };

export interface MergeState {
  /** The commit being merged in (MERGE_HEAD). */
  theirs: string;
  /** Human-friendly name of what is being merged, e.g. a branch name. */
  label: string;
  /** Paths that still contain unresolved conflicts. */
  conflicts: string[];
}

/** One `git stash` entry: the tracked work that was set aside, relative to the commit it was based on. */
export interface StashEntry {
  message: string;
  base: string;
  index: FileTree;
  workdir: FileTree;
  /** Every tracked path at stash time (so deletions can be restored too). */
  paths: string[];
}

/** A repository hosted on the simulated GitHub. */
export interface HostedRepo {
  commits: Record<string, Commit>;
  branches: Record<string, string>;
  defaultBranch: string;
}

export interface ReflogEntry {
  commit: string;
  action: string;
}

/**
 * The entire simulated repository. Plain, serialisable data so it can be
 * cloned, snapshotted for undo, and diffed for animations.
 */
export interface RepoState {
  initialized: boolean;
  commits: Record<string, Commit>;
  branches: Record<string, string>;
  tags: Record<string, string>;
  head: Head;
  /** The staging area: a full snapshot of what the next commit will contain. */
  index: FileTree;
  /** The files on disk. */
  workdir: FileTree;
  merge: MergeState | null;
  reflog: ReflogEntry[];
  config: Record<string, string>;
  stash: StashEntry[];
  /** Remote name -> URL, e.g. origin -> https://github.com/team/site */
  remotes: Record<string, string>;
  /** Remote-tracking branches, e.g. "origin/main" -> commit id (what we last saw on the remote). */
  remoteRefs: Record<string, string>;
  /** Local branch -> the remote-tracking branch it follows, e.g. main -> origin/main */
  upstreams: Record<string, string>;
  /** The simulated internet: hosted repositories by URL. */
  servers: Record<string, HostedRepo>;
  clock: number;
}
