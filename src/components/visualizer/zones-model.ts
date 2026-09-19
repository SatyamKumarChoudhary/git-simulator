import { type RepoState, computeStatus, contentKey, diffTrees, headTree } from "@/engine";

export type ZoneId = "work" | "stage" | "repo";

export type CardStatus =
  | "ignored"
  | "untracked"
  | "modified"
  | "deleted"
  | "conflict"
  | "clean"
  | "staged-added"
  | "staged-modified"
  | "staged-deleted"
  | "committed";

export interface FileCardModel {
  zone: ZoneId;
  path: string;
  status: CardStatus;
  /** Fingerprint of this version of the file — the same blob in two zones is "the same copy". */
  blob: string;
  content: string | null;
  /** Working directory only: this exact version is also in the staging area (and differs from the last commit). */
  alsoStaged?: boolean;
  /** Repository only: the staging area holds a newer version (or the deletion) for the next commit. */
  superseded?: boolean;
}

export interface ZonesModel {
  work: FileCardModel[];
  stage: FileCardModel[];
  repo: FileCardModel[];
}

export const STATUS_STYLE: Record<CardStatus, { letter: string; label: string; color: string; description: string; strike?: boolean; dashed?: boolean }> = {
  ignored: { letter: "I", label: "ignored", color: "#475569", description: "Ignored by .gitignore — Git pretends this file doesn't exist.", dashed: true },
  untracked: { letter: "U", label: "untracked", color: "#38bdf8", description: "A new file Git isn't tracking yet. git add it to include it.", dashed: true },
  modified: { letter: "M", label: "modified", color: "#fbbf24", description: "Changed on disk since it was last staged. git add to stage the change." },
  deleted: { letter: "D", label: "deleted", color: "#fb7185", description: "Deleted from disk, but the deletion isn't staged yet.", strike: true },
  conflict: { letter: "!", label: "conflict", color: "#f43f5e", description: "Has a merge conflict. Pick a side with git checkout --ours or --theirs, then git add it to mark it resolved." },
  clean: { letter: "✓", label: "unchanged", color: "#64748b", description: "Identical to the copy in the staging area." },
  "staged-added": { letter: "A", label: "new file", color: "#34d399", description: "Staged: this new file will be added in the next commit." },
  "staged-modified": { letter: "M", label: "changed", color: "#34d399", description: "Staged: this version will replace the committed one in the next commit." },
  "staged-deleted": { letter: "D", label: "deleted", color: "#34d399", description: "Staged: this file will be removed in the next commit.", strike: true },
  committed: { letter: "●", label: "saved", color: "#a78bfa", description: "Safely stored in the commit HEAD points to." },
};

/** Short badge shown next to a file name; files with nothing to report have none. */
export const STATUS_BADGE: Partial<Record<CardStatus, string>> = {
  ignored: "ignored",
  untracked: "U",
  modified: "M",
  deleted: "D",
  conflict: "!",
  "staged-added": "A",
  "staged-modified": "M",
  "staged-deleted": "D",
};

export const ZONE_NAMES: Record<ZoneId, string> = { work: "Working directory", stage: "Staging area", repo: "Repository" };

const DELETED = "deleted";

export function buildZones(state: RepoState): ZonesModel {
  const conflicts = state.merge?.conflicts ?? [];
  const ignored = state.initialized ? computeStatus(state).ignored : [];
  const committed = state.initialized ? headTree(state) : {};
  const lastCommitted = (path: string) => (Object.hasOwn(committed, path) ? committed[path] : undefined);
  const work: FileCardModel[] = [];
  const paths = [...new Set([...Object.keys(state.workdir), ...(state.initialized ? Object.keys(state.index) : [])])].sort();

  for (const path of paths) {
    const onDisk = Object.hasOwn(state.workdir, path) ? state.workdir[path] : undefined;
    const staged = state.initialized && Object.hasOwn(state.index, path) ? state.index[path] : undefined;
    let status: CardStatus;
    if (!state.initialized) status = "untracked";
    else if (conflicts.includes(path)) status = "conflict";
    else if (staged === undefined) status = ignored.includes(path) ? "ignored" : "untracked";
    else if (onDisk === undefined) status = "deleted";
    else if (onDisk !== staged) status = "modified";
    else status = "clean";
    work.push({
      zone: "work",
      path,
      status,
      blob: onDisk === undefined ? DELETED : contentKey(onDisk),
      content: onDisk ?? null,
      alsoStaged: status === "clean" && staged !== lastCommitted(path),
    });
  }

  if (!state.initialized) return { work, stage: [], repo: [] };

  const stage: FileCardModel[] = diffTrees(committed, state.index)
    .filter((change) => !conflicts.includes(change.path))
    .map((change) => {
      const content = change.kind === "deleted" ? null : state.index[change.path];
      return {
        zone: "stage" as const,
        path: change.path,
        status: `staged-${change.kind}` as CardStatus,
        blob: content === null ? DELETED : contentKey(content),
        content,
      };
    });

  const repo: FileCardModel[] = Object.keys(committed)
    .sort()
    .map((path) => ({
      zone: "repo" as const,
      path,
      status: "committed" as const,
      blob: contentKey(committed[path]),
      content: committed[path],
      superseded: !conflicts.includes(path) && (Object.hasOwn(state.index, path) ? state.index[path] : undefined) !== committed[path],
    }));

  return { work, stage, repo };
}

export interface FlightPlan {
  from: string;
  to: string;
  path: string;
  color: string;
}

export const cardKey = (card: Pick<FileCardModel, "zone" | "path">) => `${card.zone}:${card.path}`;

/** Works out which file copies visibly travel between zones (git add, git commit, unstaging). */
export function planFlights(previous: ZonesModel, next: ZonesModel): FlightPlan[] {
  const find = (cards: FileCardModel[], path: string) => cards.find((card) => card.path === path);
  const flights: FlightPlan[] = [];

  for (const card of next.stage) {
    const before = find(previous.stage, card.path);
    if (before?.blob === card.blob) continue;
    const source = find(previous.work, card.path);
    if (source && source.blob === card.blob) {
      flights.push({ from: cardKey(source), to: cardKey(card), path: card.path, color: STATUS_STYLE[card.status].color });
    }
  }

  for (const card of next.repo) {
    const before = find(previous.repo, card.path);
    if (before?.blob === card.blob) continue;
    const source = find(previous.stage, card.path);
    if (source && source.blob === card.blob) {
      flights.push({ from: cardKey(source), to: cardKey(card), path: card.path, color: STATUS_STYLE.committed.color });
    }
  }

  for (const card of previous.stage) {
    const still = find(next.stage, card.path);
    if (still?.blob === card.blob) continue;
    const target = find(next.work, card.path);
    const targetBefore = find(previous.work, card.path);
    const committed = find(next.repo, card.path)?.blob === card.blob;
    if (target && target.blob === card.blob && targetBefore?.status !== target.status && !committed) {
      flights.push({ from: cardKey(card), to: cardKey(target), path: card.path, color: STATUS_STYLE[target.status].color });
    }
  }
  return flights;
}
