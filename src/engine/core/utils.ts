/** Safe own-property lookup — user input like "constructor" must never hit the prototype. */
export function own<T>(record: Record<string, T>, key: string): T | undefined {
  return Object.hasOwn(record, key) ? record[key] : undefined;
}

export function hashString(input: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ code, 0x01000193);
    h2 = Math.imul(h2 ^ code, 0x85ebca6b);
    h2 ^= h2 >>> 13;
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 0x7feb352d);
  return (h1 >>> 0).toString(16).padStart(8, "0") + (h2 >>> 0).toString(16).padStart(8, "0");
}

export function sortedUnion(...lists: Iterable<string>[]): string[] {
  const set = new Set<string>();
  for (const list of lists) for (const item of list) set.add(item);
  return [...set].sort();
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function levenshtein(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const above = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = above;
    }
  }
  return prev[b.length];
}

/** Closest candidate within a typo-sized distance, or null. */
export function closestMatch(input: string, candidates: Iterable<string>): string | null {
  let best: string | null = null;
  let bestDistance = Infinity;
  const limit = Math.max(2, Math.floor(input.length / 3));
  for (const candidate of candidates) {
    const distance = levenshtein(input.toLowerCase(), candidate.toLowerCase());
    if (distance < bestDistance && distance <= limit) {
      best = candidate;
      bestDistance = distance;
    }
  }
  return best;
}

export function splitLines(content: string | undefined): string[] {
  if (content === undefined || content === "") return [];
  return content.split("\n");
}
