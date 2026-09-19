import { CommandError } from "./errors";
import { headCommitId } from "./repo";
import type { RepoState } from "./types";
import { closestMatch, own } from "./utils";

export function shortId(id: string): string {
  return id.slice(0, 7);
}

/**
 * Resolves a revision like `HEAD`, `main`, `v1.0`, `a1b2c3d`, `HEAD~2` or `feature^2`
 * to a commit id. Throws a CommandError with a helpful hint when it can't.
 */
export function resolveRevision(state: RepoState, revision: string): string {
  const input = revision.trim();
  if (!input) throw new CommandError("fatal: empty revision");

  const cut = input.search(/[~^]/);
  const base = cut === -1 ? input : input.slice(0, cut);
  const suffix = cut === -1 ? "" : input.slice(cut);
  let id = resolveBase(state, base, input);

  let consumed = 0;
  for (const match of suffix.matchAll(/([~^])(\d*)/g)) {
    if (match.index !== consumed) throw unknownRevision(state, input, base);
    consumed += match[0].length;
    const count = match[2] === "" ? 1 : Number(match[2]);

    if (match[1] === "~") {
      for (let step = 0; step < count; step++) id = parentOf(state, id, 0, input);
    } else if (count > 0) {
      id = parentOf(state, id, count - 1, input);
    }
  }
  if (consumed !== suffix.length) throw unknownRevision(state, input, base);
  return id;
}

export function tryResolveRevision(state: RepoState, revision: string): string | null {
  try {
    return resolveRevision(state, revision);
  } catch {
    return null;
  }
}

function parentOf(state: RepoState, id: string, parentIndex: number, input: string): string {
  const parent = own(state.commits, id)?.parents[parentIndex];
  if (!parent) {
    throw new CommandError(
      `fatal: ambiguous argument '${input}': unknown revision or path not in the working tree.`,
      parentIndex === 0
        ? `Commit ${shortId(id)} has no parent — that goes further back than the history does.`
        : `Commit ${shortId(id)} doesn't have a parent #${parentIndex + 1}. Only merge commits have a second parent.`,
    );
  }
  return parent;
}

function resolveBase(state: RepoState, base: string, input: string): string {
  const reflogRef = /^(?:HEAD)?@\{(\d+)\}$/.exec(base);
  if (reflogRef) {
    const entry = state.reflog[Number(reflogRef[1])];
    if (!entry) {
      throw new CommandError(`fatal: log for 'HEAD' only has ${state.reflog.length} entries`, "Run git reflog to see the entries that exist.");
    }
    return entry.commit;
  }
  if (base === "HEAD" || base === "@") {
    const id = headCommitId(state);
    if (!id) {
      throw new CommandError(
        `fatal: ambiguous argument '${input}': unknown revision or path not in the working tree.`,
        "There are no commits yet, so HEAD doesn't point at anything. Make your first commit!",
      );
    }
    return id;
  }
  const branch = own(state.branches, base);
  if (branch) return branch;
  const tag = own(state.tags, base);
  if (tag) return tag;
  const remoteRef = own(state.remoteRefs, base);
  if (remoteRef) return remoteRef;

  if (/^[0-9a-f]{4,40}$/i.test(base)) {
    const prefix = base.toLowerCase();
    const matches = Object.keys(state.commits).filter((id) => id.startsWith(prefix));
    if (matches.length === 1) return matches[0];
    if (matches.length > 1) {
      throw new CommandError(
        `error: short object ID ${base} is ambiguous`,
        "Several commits start with those characters. Type a few more of the hash.",
      );
    }
  }
  throw unknownRevision(state, input, base);
}

function unknownRevision(state: RepoState, input: string, base: string): CommandError {
  const suggestion = closestMatch(base, [...Object.keys(state.branches), ...Object.keys(state.tags), ...Object.keys(state.remoteRefs), "HEAD"]);
  return new CommandError(
    `fatal: ambiguous argument '${input}': unknown revision or path not in the working tree.`,
    suggestion
      ? `There's no branch, tag or commit called '${base}'. Did you mean '${suggestion}'?`
      : `There's no branch, tag or commit called '${base}'. Use a branch name, a tag, a commit hash, or HEAD~1 style references.`,
  );
}

/** Returns a reason the name is invalid, or null when it's a fine branch/tag name. */
export function refNameProblem(name: string): string | null {
  if (!name) return "a name is required";
  if (name.startsWith("-")) return `'${name}' is not a valid name (names can't start with '-')`;
  if (
    /[\s~^:?*[\\]/.test(name) ||
    name.includes("..") ||
    name.includes("@{") ||
    name.endsWith(".") ||
    name.endsWith("/") ||
    name.startsWith("/") ||
    name.endsWith(".lock") ||
    name === "HEAD" ||
    name === "@"
  ) {
    return `'${name}' is not a valid name`;
  }
  return null;
}

export interface RefsAtCommit {
  head: boolean;
  headBranch: string | null;
  branches: string[];
  tags: string[];
  remotes: string[];
}

export function refsAt(state: RepoState, id: string): RefsAtCommit {
  const headId = headCommitId(state);
  const branches = Object.keys(state.branches).filter((name) => state.branches[name] === id);
  const tags = Object.keys(state.tags).filter((name) => state.tags[name] === id);
  const remotes = Object.keys(state.remoteRefs).filter((name) => state.remoteRefs[name] === id);
  const headBranch = state.head.kind === "branch" && branches.includes(state.head.name) ? state.head.name : null;
  return { head: headId === id, headBranch, branches, tags, remotes };
}
