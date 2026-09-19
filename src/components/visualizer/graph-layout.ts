import { type Commit, type RepoState, headCommitId, reachableCommits, shortId } from "@/engine";
import { HEAD_COLOR, ORPHAN_COLOR, branchColor } from "@/lib/theme";

export interface GraphSpacing {
  col: number;
  row: number;
  padX: number;
  padTop: number;
  padBottom: number;
  /** Distance from a commit to its first branch/tag label. */
  labelOffset: number;
  labelGap: number;
  maxLabels: number;
}

export const DEFAULT_SPACING: GraphSpacing = { col: 150, row: 180, padX: 90, padTop: 110, padBottom: 110, labelOffset: 44, labelGap: 26, maxLabels: 2 };

export interface GraphNode {
  id: string;
  shortId: string;
  message: string;
  author: string;
  x: number;
  y: number;
  color: string;
  reachable: boolean;
  isHead: boolean;
  isMerge: boolean;
  parents: string[];
  copiedFrom?: string;
  fileCount: number;
}

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  d: string;
  color: string;
  reachable: boolean;
}

export interface GraphLabel {
  key: string;
  kind: "branch" | "tag" | "more";
  name: string;
  x: number;
  y: number;
  color: string;
  current: boolean;
}

export interface HeadMarker {
  /** Position of the commit HEAD points at. */
  x: number;
  y: number;
  label: string;
  detached: boolean;
  commitId: string;
}

export interface GraphLayout {
  width: number;
  height: number;
  nodes: GraphNode[];
  edges: GraphEdge[];
  labels: GraphLabel[];
  head: HeadMarker | null;
  positions: Map<string, { x: number; y: number }>;
}

interface Lane {
  color: string;
  orphan: boolean;
  depths: Set<number>;
}

/** Branch order for lanes: the default branch first, then creation order. */
function orderedBranches(state: RepoState): string[] {
  const names = Object.keys(state.branches);
  return [...names.filter((n) => n === "main" || n === "master"), ...names.filter((n) => n !== "main" && n !== "master")];
}

/**
 * Lays commits out left → right by generation and top → bottom by lane.
 * Each branch claims a lane for commits that are only reachable through it;
 * unreachable ("orphaned") commits get faded lanes at the bottom.
 */
export function layoutGraph(state: RepoState, spacing: GraphSpacing = DEFAULT_SPACING, { showUnreachable = true } = {}): GraphLayout {
  const reachable = reachableCommits(state);
  const commits: Commit[] = Object.values(state.commits)
    .filter((commit) => showUnreachable || reachable.has(commit.id))
    .sort((a, b) => a.order - b.order);
  const visible = new Set(commits.map((commit) => commit.id));

  const depth = new Map<string, number>();
  for (const commit of commits) {
    const parentDepths = commit.parents.filter((p) => depth.has(p)).map((p) => depth.get(p)!);
    depth.set(commit.id, parentDepths.length ? Math.max(...parentDepths) + 1 : 0);
  }

  const lanes: Lane[] = [];
  const laneOf = new Map<string, number>();

  const claim = (tip: string | undefined, color: string, orphan = false) => {
    const chain: string[] = [];
    for (let id = tip; id && visible.has(id) && !laneOf.has(id); id = state.commits[id].parents[0]) chain.push(id);
    if (chain.length === 0) return;

    let index = orphan
      ? lanes.findIndex((lane) => lane.orphan && chain.every((id) => !lane.depths.has(depth.get(id)!)))
      : -1;
    if (index === -1) {
      index = lanes.length;
      lanes.push({ color, orphan, depths: new Set() });
    }
    for (const id of chain) {
      laneOf.set(id, index);
      lanes[index].depths.add(depth.get(id)!);
    }
  };

  for (const name of orderedBranches(state)) claim(state.branches[name], branchColor(name));
  if (state.head.kind === "detached") claim(state.head.commit, HEAD_COLOR);
  for (const name of Object.keys(state.tags)) claim(state.tags[name], "#fbbf24");
  if (state.merge) claim(state.merge.theirs, "#f472b6");
  // Whatever is left: second-parent history of deleted branches, then orphaned commits.
  for (const commit of [...commits].reverse()) {
    const isReachable = reachable.has(commit.id);
    claim(commit.id, isReachable ? "#94a3b8" : ORPHAN_COLOR, !isReachable);
  }

  const positions = new Map<string, { x: number; y: number }>();
  let maxDepth = 0;
  for (const commit of commits) {
    const d = depth.get(commit.id)!;
    maxDepth = Math.max(maxDepth, d);
    positions.set(commit.id, { x: spacing.padX + d * spacing.col, y: spacing.padTop + laneOf.get(commit.id)! * spacing.row });
  }

  const headId = headCommitId(state);
  const nodes: GraphNode[] = commits.map((commit) => {
    const lane = lanes[laneOf.get(commit.id)!];
    const isReachable = reachable.has(commit.id);
    return {
      id: commit.id,
      shortId: shortId(commit.id),
      message: commit.message,
      author: commit.author,
      ...positions.get(commit.id)!,
      color: isReachable ? lane.color : ORPHAN_COLOR,
      reachable: isReachable,
      isHead: commit.id === headId,
      isMerge: commit.parents.length > 1,
      parents: commit.parents,
      copiedFrom: commit.copiedFrom,
      fileCount: Object.keys(commit.tree).length,
    };
  });

  const edges: GraphEdge[] = [];
  for (const commit of commits) {
    const to = positions.get(commit.id)!;
    commit.parents.forEach((parent, i) => {
      const from = positions.get(parent);
      if (!from) return;
      // Always "M L C" so paths can morph smoothly between shapes.
      const bendX = Math.max(from.x, to.x - spacing.col * 0.85);
      const midX = bendX + (to.x - bendX) / 2;
      const d =
        from.y === to.y
          ? `M ${from.x} ${from.y} L ${midX} ${to.y} C ${midX} ${to.y}, ${midX} ${to.y}, ${to.x} ${to.y}`
          : `M ${from.x} ${from.y} L ${bendX} ${from.y} C ${midX} ${from.y}, ${midX} ${to.y}, ${to.x} ${to.y}`;
      const childLane = lanes[laneOf.get(commit.id)!];
      const parentLane = lanes[laneOf.get(parent)!];
      edges.push({
        id: `${parent}->${commit.id}`,
        from: parent,
        to: commit.id,
        d,
        color: i > 0 ? parentLane.color : childLane.color,
        reachable: reachable.has(commit.id),
      });
    });
  }

  const labels: GraphLabel[] = [];
  const currentBranch = state.head.kind === "branch" ? state.head.name : null;
  const refsByCommit = new Map<string, Array<Omit<GraphLabel, "x" | "y">>>();
  const addRef = (id: string, label: Omit<GraphLabel, "x" | "y">) => {
    if (!positions.has(id)) return;
    refsByCommit.set(id, [...(refsByCommit.get(id) ?? []), label]);
  };
  for (const name of orderedBranches(state)) {
    addRef(state.branches[name], { key: `branch:${name}`, kind: "branch", name, color: branchColor(name), current: name === currentBranch });
  }
  for (const name of Object.keys(state.tags)) {
    addRef(state.tags[name], { key: `tag:${name}`, kind: "tag", name, color: "#fbbf24", current: false });
  }
  for (const [id, refs] of refsByCommit) {
    const pos = positions.get(id)!;
    const sorted = [...refs].sort((a, b) => Number(b.current) - Number(a.current));
    const shown =
      sorted.length > spacing.maxLabels
        ? [
            ...sorted.slice(0, spacing.maxLabels - 1),
            { key: `more:${id}`, kind: "more" as const, name: `+${sorted.length - spacing.maxLabels + 1} more`, color: "#94a3b8", current: false },
          ]
        : sorted;
    shown.forEach((label, i) => labels.push({ ...label, x: pos.x, y: pos.y + spacing.labelOffset + i * spacing.labelGap }));
  }

  let head: HeadMarker | null = null;
  if (headId && positions.has(headId)) {
    const pos = positions.get(headId)!;
    head = {
      x: pos.x,
      y: pos.y,
      label: currentBranch ? `HEAD → ${currentBranch}` : "HEAD (detached)",
      detached: !currentBranch,
      commitId: headId,
    };
  }

  return {
    width: spacing.padX * 2 + maxDepth * spacing.col,
    height: spacing.padTop + Math.max(0, lanes.length - 1) * spacing.row + spacing.padBottom,
    nodes,
    edges,
    labels,
    head,
    positions,
  };
}
