import { splitLines } from "./utils";

export type DiffLineKind = "context" | "add" | "remove";

export interface DiffLine {
  kind: DiffLineKind;
  text: string;
}

/** Index pairs [aIndex, bIndex] of a longest common subsequence of lines. */
function lcsPairs(a: string[], b: string[]): Array<[number, number]> {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const table = new Uint32Array(rows * cols);
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      table[i * cols + j] =
        a[i] === b[j]
          ? table[(i + 1) * cols + j + 1] + 1
          : Math.max(table[(i + 1) * cols + j], table[i * cols + j + 1]);
    }
  }
  const pairs: Array<[number, number]> = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      pairs.push([i, j]);
      i++;
      j++;
    } else if (table[(i + 1) * cols + j] >= table[i * cols + j + 1]) {
      i++;
    } else {
      j++;
    }
  }
  return pairs;
}

export function diffLines(before: string | undefined, after: string | undefined): DiffLine[] {
  const a = splitLines(before);
  const b = splitLines(after);
  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  for (const [ai, bj] of [...lcsPairs(a, b), [a.length, b.length] as [number, number]]) {
    while (i < ai) out.push({ kind: "remove", text: a[i++] });
    while (j < bj) out.push({ kind: "add", text: b[j++] });
    if (ai < a.length && bj < b.length) {
      out.push({ kind: "context", text: a[ai] });
      i = ai + 1;
      j = bj + 1;
    }
  }
  return out;
}

export interface ContentMergeResult {
  content: string;
  conflicted: boolean;
}

export interface MergeLabels {
  ours: string;
  theirs: string;
}

function sameLines(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((line, i) => line === b[i]);
}

/**
 * Line-based three-way merge (diff3). Changes to different regions combine cleanly;
 * overlapping edits produce Git-style conflict markers around just that region.
 */
export function mergeContents(
  base: string | undefined,
  ours: string | undefined,
  theirs: string | undefined,
  labels: MergeLabels,
): ContentMergeResult {
  const baseLines = splitLines(base);
  const ourLines = splitLines(ours);
  const theirLines = splitLines(theirs);

  const toOurs = new Map(lcsPairs(baseLines, ourLines));
  const toTheirs = new Map(lcsPairs(baseLines, theirLines));

  const out: string[] = [];
  let conflicted = false;
  let b = 0;
  let o = 0;
  let t = 0;

  while (b < baseLines.length || o < ourLines.length || t < theirLines.length) {
    // Stable region: all three agree line by line.
    while (b < baseLines.length && toOurs.get(b) === o && toTheirs.get(b) === t) {
      out.push(baseLines[b]);
      b++;
      o++;
      t++;
    }
    if (b >= baseLines.length && o >= ourLines.length && t >= theirLines.length) break;

    // Find the next base line that both sides still contain.
    let nb = baseLines.length;
    let no = ourLines.length;
    let nt = theirLines.length;
    for (let k = b; k < baseLines.length; k++) {
      const mo = toOurs.get(k);
      const mt = toTheirs.get(k);
      if (mo !== undefined && mt !== undefined && mo >= o && mt >= t) {
        nb = k;
        no = mo;
        nt = mt;
        break;
      }
    }

    const baseChunk = baseLines.slice(b, nb);
    const ourChunk = ourLines.slice(o, no);
    const theirChunk = theirLines.slice(t, nt);

    if (sameLines(ourChunk, baseChunk)) out.push(...theirChunk);
    else if (sameLines(theirChunk, baseChunk) || sameLines(ourChunk, theirChunk)) out.push(...ourChunk);
    else {
      conflicted = true;
      out.push(`<<<<<<< ${labels.ours}`, ...ourChunk, "=======", ...theirChunk, `>>>>>>> ${labels.theirs}`);
    }
    b = nb;
    o = no;
    t = nt;
  }

  return { content: out.join("\n"), conflicted };
}

export function hasConflictMarkers(content: string | undefined): boolean {
  return content !== undefined && /^(<<<<<<< |=======$|>>>>>>> )/m.test(content);
}
