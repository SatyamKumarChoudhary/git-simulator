import { type RepoState, headCommitId } from "@/engine";
import { branchColor } from "@/lib/theme";
import { type GraphSpacing, layoutGraph } from "../graph-layout";

/** Every size the layout depends on, so the same algorithm can draw the full board and small previews. */
export interface ListMetrics {
  nodeW: number;
  nodeH: number;
  pillH: number;
  /** Length of an arrowhead; lines stop short so the head sits exactly on the target. */
  arrow: number;
  /** Space between an arrowhead's tip and what it points at. */
  tipGap: number;
  pillGap: number;
  rowGap: number;
  /** Widest row of pills above one commit before they wrap. */
  rowMax: number;
  /** Vertical room for the arrow between a pointer and the commit it points to. */
  pointerReach: number;
  headReach: number;
  headWidth: number;
  /** Pill width = max(pillMin, characters × pillChar + pillPad). */
  pillMin: number;
  pillChar: number;
  pillPad: number;
  /** Pointer arrows land at least this far inside a commit's edges. */
  tipInset: number;
  spacing: GraphSpacing;
}

export const LINKED_LIST_SPACING: GraphSpacing = {
  col: 248,
  row: 230,
  padX: 132,
  padTop: 214,
  padBottom: 72,
  labelOffset: 0,
  labelGap: 0,
  maxLabels: 99,
};

export const FULL_METRICS: ListMetrics = {
  nodeW: 168,
  nodeH: 64,
  pillH: 28,
  arrow: 11,
  tipGap: 2,
  pillGap: 8,
  rowGap: 10,
  rowMax: 220,
  pointerReach: 40,
  headReach: 30,
  headWidth: 66,
  pillMin: 54,
  pillChar: 7.8,
  pillPad: 32,
  tipInset: 18,
  spacing: LINKED_LIST_SPACING,
};

/** Small previews, e.g. a level's goal. */
export const MINI_METRICS: ListMetrics = {
  nodeW: 82,
  nodeH: 34,
  pillH: 17,
  arrow: 6,
  tipGap: 1,
  pillGap: 4,
  rowGap: 4,
  rowMax: 124,
  pointerReach: 13,
  headReach: 10,
  headWidth: 40,
  pillMin: 30,
  pillChar: 6,
  pillPad: 12,
  tipInset: 10,
  spacing: { col: 108, row: 96, padX: 46, padTop: 98, padBottom: 26, labelOffset: 0, labelGap: 0, maxLabels: 99 },
};

export const NODE_W = FULL_METRICS.nodeW;
export const NODE_H = FULL_METRICS.nodeH;
export const PILL_H = FULL_METRICS.pillH;
export const ARROW = FULL_METRICS.arrow;

/** Edge colours are CSS variables so they follow the light / dark appearance. */
export const COLORS = {
  edge: "var(--c-edge)",
  edgeFaded: "var(--c-edge-faded)",
  head: "#f97316",
  tag: "#fbbf24",
  mergeHead: "#f43f5e",
  remote: "#64748b",
  stash: "#a855f7",
};

export interface ListNode {
  id: string;
  shortId: string;
  message: string;
  x: number;
  y: number;
  color: string;
  reachable: boolean;
  isHead: boolean;
  conflicted: boolean;
  copiedFrom?: string;
}

export interface ListEdge {
  id: string;
  child: string;
  parent: string;
  /** Centres of the child and parent commits, for skins that draw their own connections. */
  from: { x: number; y: number };
  to: { x: number; y: number };
  /** The line the link belongs to: the child's lane, or for a merge's other parent, that parent's lane. */
  color: string;
  d: string;
  /** Where the arrowhead's tip touches the parent. */
  tipX: number;
  tipY: number;
  reachable: boolean;
}

export type PointerKind = "branch" | "tag" | "head" | "merge" | "remote" | "stash";

export interface Pointer {
  key: string;
  kind: PointerKind;
  name: string;
  /** Centre of the pill. */
  x: number;
  y: number;
  width: number;
  color: string;
  current: boolean;
  /** Arrow from the bottom of the pill to exactly what it points at. */
  arrow: string;
  tipX: number;
  tipY: number;
  /** Commit this pointer (or, for HEAD, its branch) ultimately points at. */
  target: string;
}

export interface LinkedListLayout {
  width: number;
  height: number;
  nodes: ListNode[];
  edges: ListEdge[];
  pointers: Pointer[];
  positions: Map<string, { x: number; y: number }>;
  headNodeX: number | null;
}

export const pillWidth = (name: string, m: ListMetrics) => Math.max(m.pillMin, Math.round(name.length * m.pillChar + m.pillPad));

/** Smooth vertical connector from (x1, y1) down to (x2, y2). */
function verticalArrow(x1: number, y1: number, x2: number, y2: number): string {
  const midY = (y1 + y2) / 2;
  return `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
}

/** Arrow from a commit's left edge back to its parent's right edge — the "next" pointer of the linked list. */
function parentArrow(child: { x: number; y: number }, parent: { x: number; y: number }, m: ListMetrics): string {
  const sx = child.x - m.nodeW / 2;
  const ex = parent.x + m.nodeW / 2 + m.tipGap + m.arrow;
  const midX = (sx + ex) / 2;
  return `M ${sx} ${child.y} C ${midX} ${child.y}, ${midX} ${parent.y}, ${ex} ${parent.y}`;
}

interface PendingRef {
  key: string;
  kind: PointerKind;
  name: string;
  color: string;
  current: boolean;
}

/** Packs pills into rows no wider than `rowMax`; used both to measure and to place them. */
function packRows(refs: PendingRef[], m: ListMetrics): PendingRef[][] {
  const rows: PendingRef[][] = [];
  let row: PendingRef[] = [];
  let rowWidth = 0;
  for (const ref of refs) {
    const width = ref.kind === "head" ? m.headWidth : pillWidth(ref.name, m);
    if (row.length > 0 && rowWidth + m.pillGap + width > m.rowMax) {
      rows.push(row);
      row = [];
      rowWidth = 0;
    }
    rowWidth += (row.length > 0 ? m.pillGap : 0) + width;
    row.push(ref);
  }
  if (row.length > 0) rows.push(row);
  // HEAD sits above the highest row, so the current branch's row goes on top — HEAD's arrow never crosses another pill.
  const currentRow = rows.findIndex((items) => items.some((ref) => ref.kind === "branch" && ref.current));
  if (currentRow >= 0 && currentRow < rows.length - 1) rows.push(...rows.splice(currentRow, 1));
  return rows;
}

/** Every branch, tag, remote ref, stash and HEAD, grouped by the commit it points at. */
function collectRefs(state: RepoState): Map<string, PendingRef[]> {
  const currentBranch = state.head.kind === "branch" ? state.head.name : null;
  const refsAt = new Map<string, PendingRef[]>();
  const add = (id: string | undefined, ref: PendingRef) => {
    if (!id) return;
    refsAt.set(id, [...(refsAt.get(id) ?? []), ref]);
  };
  const branchNames = Object.keys(state.branches).sort((a, b) => Number(b === currentBranch) - Number(a === currentBranch));
  for (const name of branchNames) {
    add(state.branches[name], { key: `branch:${name}`, kind: "branch", name, color: branchColor(name), current: name === currentBranch });
  }
  for (const name of Object.keys(state.tags)) add(state.tags[name], { key: `tag:${name}`, kind: "tag", name, color: COLORS.tag, current: false });
  for (const name of Object.keys(state.remoteRefs)) {
    add(state.remoteRefs[name], { key: `remote:${name}`, kind: "remote", name, color: COLORS.remote, current: false });
  }
  if (state.stash.length > 0) add(state.stash[0].base, { key: "stash", kind: "stash", name: "stash", color: COLORS.stash, current: false });
  if (state.head.kind === "detached") add(state.head.commit, { key: "HEAD", kind: "head", name: "HEAD", color: COLORS.head, current: true });
  if (state.merge) add(state.merge.theirs, { key: "MERGE_HEAD", kind: "merge", name: "MERGE_HEAD", color: COLORS.mergeHead, current: false });
  return refsAt;
}

/** Room above the top row of commits: enough for the tallest stack of pills, plus HEAD above it. */
function topPadding(refsAt: Map<string, PendingRef[]>, m: ListMetrics): number {
  let rows = 1;
  for (const refs of refsAt.values()) rows = Math.max(rows, packRows(refs, m).length);
  const stack = rows * m.pillH + (rows - 1) * m.rowGap;
  const needed = m.nodeH / 2 + m.pointerReach + stack + m.headReach + m.pillH + 6;
  return Math.max(m.spacing.padTop, Math.ceil(needed));
}

export function layoutLinkedList(state: RepoState, m: ListMetrics = FULL_METRICS): LinkedListLayout {
  const allRefs = collectRefs(state);
  const graph = layoutGraph(state, { ...m.spacing, padTop: topPadding(allRefs, m) });
  const conflicted = Boolean(state.merge && state.merge.conflicts.length > 0);

  const nodes: ListNode[] = graph.nodes.map((node) => ({
    id: node.id,
    shortId: node.shortId,
    message: node.message,
    x: node.x,
    y: node.y,
    color: node.color,
    reachable: node.reachable,
    isHead: node.isHead,
    conflicted: conflicted && node.isHead,
    copiedFrom: node.copiedFrom,
  }));

  const edges: ListEdge[] = [];
  const colorOf = new Map(graph.nodes.map((node) => [node.id, node.color]));
  for (const node of graph.nodes) {
    node.parents.forEach((parent, index) => {
      const to = graph.positions.get(parent);
      if (to) {
        edges.push({
          id: `${node.id}->${parent}`,
          child: node.id,
          parent,
          from: { x: node.x, y: node.y },
          to,
          color: index === 0 ? node.color : (colorOf.get(parent) ?? node.color),
          d: parentArrow(node, to, m),
          tipX: to.x + m.nodeW / 2 + m.tipGap,
          tipY: to.y,
          reachable: node.reachable,
        });
      }
    });
  }

  const currentBranch = state.head.kind === "branch" ? state.head.name : null;
  const refsAt = new Map([...allRefs].filter(([id]) => graph.positions.has(id)));

  const pointers: Pointer[] = [];
  const topRowY = new Map<string, number>();

  for (const [id, refs] of refsAt) {
    const node = graph.positions.get(id)!;
    const rows = packRows(refs, m);

    const nodeTop = node.y - m.nodeH / 2;
    rows.forEach((items, r) => {
      const widths = items.map((ref) => (ref.kind === "head" ? m.headWidth : pillWidth(ref.name, m)));
      const total = widths.reduce((sum, w) => sum + w, 0) + m.pillGap * (items.length - 1);
      const y = nodeTop - m.pointerReach - m.pillH / 2 - r * (m.pillH + m.rowGap);
      topRowY.set(id, y);
      let left = node.x - total / 2;
      items.forEach((ref, i) => {
        const x = left + widths[i] / 2;
        left += widths[i] + m.pillGap;
        const reach = m.nodeW / 2 - m.tipInset;
        const tipX = node.x + Math.max(-reach, Math.min(reach, (x - node.x) * 0.45));
        const tipY = nodeTop - m.tipGap;
        pointers.push({
          ...ref,
          x,
          y,
          width: widths[i],
          arrow: verticalArrow(x, y + m.pillH / 2, tipX, tipY - m.arrow),
          tipX,
          tipY,
          target: id,
        });
      });
    });
  }

  // An attached HEAD points at its branch pointer, not at the commit.
  if (currentBranch) {
    const branch = pointers.find((pointer) => pointer.key === `branch:${currentBranch}`);
    if (branch) {
      const y = (topRowY.get(state.branches[currentBranch]) ?? branch.y) - m.pillH - m.headReach;
      const tipY = branch.y - m.pillH / 2 - m.tipGap;
      pointers.push({
        key: "HEAD",
        kind: "head",
        name: "HEAD",
        x: branch.x,
        y,
        width: m.headWidth,
        color: COLORS.head,
        current: true,
        arrow: verticalArrow(branch.x, y + m.pillH / 2, branch.x, tipY - m.arrow),
        tipX: branch.x,
        tipY,
        target: branch.target,
      });
    }
  }

  const headId = headCommitId(state);
  return {
    width: graph.width,
    height: graph.height,
    nodes,
    edges,
    pointers,
    positions: graph.positions,
    headNodeX: headId ? (graph.positions.get(headId)?.x ?? null) : null,
  };
}

/** Horizontal extent of everything drawn, including pills that stick out past the outermost commits. */
export function horizontalBounds(layout: LinkedListLayout, m: ListMetrics = FULL_METRICS): { left: number; right: number } {
  if (layout.nodes.length === 0) return { left: 0, right: layout.width };
  let left = Infinity;
  let right = -Infinity;
  for (const node of layout.nodes) {
    left = Math.min(left, node.x - m.nodeW / 2);
    right = Math.max(right, node.x + m.nodeW / 2);
  }
  for (const pointer of layout.pointers) {
    left = Math.min(left, pointer.x - pointer.width / 2);
    right = Math.max(right, pointer.x + pointer.width / 2);
  }
  return { left, right };
}
