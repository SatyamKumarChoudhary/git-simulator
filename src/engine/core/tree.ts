import { ignorePatterns, isIgnored } from "./ignore";
import { headTree } from "./repo";
import { type MergeLabels, mergeContents } from "./text";
import type { FileTree, RepoState } from "./types";
import { own, sortedUnion, splitLines } from "./utils";

export type ChangeKind = "added" | "modified" | "deleted";

export interface FileChange {
  path: string;
  kind: ChangeKind;
}

export function treesEqual(a: FileTree, b: FileTree): boolean {
  const keys = Object.keys(a);
  if (keys.length !== Object.keys(b).length) return false;
  return keys.every((key) => own(b, key) === a[key]);
}

export function diffTrees(from: FileTree, to: FileTree): FileChange[] {
  const changes: FileChange[] = [];
  for (const path of sortedUnion(Object.keys(from), Object.keys(to))) {
    const before = own(from, path);
    const after = own(to, path);
    if (before === after) continue;
    changes.push({
      path,
      kind: before === undefined ? "added" : after === undefined ? "deleted" : "modified",
    });
  }
  return changes;
}

export interface StatusReport {
  /** Differences between HEAD and the staging area. */
  staged: FileChange[];
  /** Differences between the staging area and tracked files on disk. */
  unstaged: FileChange[];
  /** Files on disk that Git doesn't know about. */
  untracked: string[];
  /** Untracked files hidden by .gitignore. */
  ignored: string[];
  /** Files with unresolved merge conflicts. */
  conflicts: string[];
}

export function computeStatus(state: RepoState): StatusReport {
  const conflicts = state.merge?.conflicts ?? [];
  const staged = diffTrees(headTree(state), state.index).filter((change) => !conflicts.includes(change.path));
  const unstaged: FileChange[] = [];
  const untracked: string[] = [];
  const ignored: string[] = [];
  const patterns = ignorePatterns(state);

  for (const path of sortedUnion(Object.keys(state.index), Object.keys(state.workdir))) {
    if (conflicts.includes(path)) continue;
    const staging = own(state.index, path);
    const disk = own(state.workdir, path);
    if (staging === undefined) {
      if (disk !== undefined && isIgnored(state, path, patterns)) ignored.push(path);
      else untracked.push(path);
    }
    else if (disk === undefined) unstaged.push({ path, kind: "deleted" });
    else if (disk !== staging) unstaged.push({ path, kind: "modified" });
  }
  return { staged, unstaged, untracked, ignored, conflicts: [...conflicts] };
}

export function hasTrackedChanges(report: StatusReport): boolean {
  return report.staged.length > 0 || report.unstaged.length > 0 || report.conflicts.length > 0;
}

export function isClean(report: StatusReport): boolean {
  return !hasTrackedChanges(report) && report.untracked.length === 0;
}

export interface TreeMergeResult {
  tree: FileTree;
  conflicts: string[];
}

/** Three-way merge of whole snapshots, file by file and line by line. */
export function mergeTrees(base: FileTree, ours: FileTree, theirs: FileTree, labels: MergeLabels): TreeMergeResult {
  const tree: FileTree = {};
  const conflicts: string[] = [];

  for (const path of sortedUnion(Object.keys(base), Object.keys(ours), Object.keys(theirs))) {
    const b = own(base, path);
    const o = own(ours, path);
    const t = own(theirs, path);

    let result: string | undefined;
    if (o === t) result = o;
    else if (o === b) result = t;
    else if (t === b) result = o;
    else if (o === undefined || t === undefined) {
      // Deleted on one side, modified on the other.
      conflicts.push(path);
      result = [`<<<<<<< ${labels.ours}`, ...splitLines(o), "=======", ...splitLines(t), `>>>>>>> ${labels.theirs}`].join("\n");
    } else {
      const merged = mergeContents(b, o, t, labels);
      if (merged.conflicted) conflicts.push(path);
      result = merged.content;
    }
    if (result !== undefined) tree[path] = result;
  }
  return { tree, conflicts };
}
