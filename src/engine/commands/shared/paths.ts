import { CommandError } from "../../core/errors";

const VALID_PATH = /^(?!\/)(?!.*\/\/)(?!.*(^|\/)\.\.?(\/|$))[\w.\-/@+]+$/;

export function assertValidPath(path: string): void {
  if (!VALID_PATH.test(path) || path.endsWith("/") || path === ".git" || path.startsWith(".git/")) {
    throw new CommandError(
      `invalid file name: '${path}'`,
      "Use simple names like notes.txt or src/app.js (letters, numbers, dots, dashes and slashes).",
    );
  }
}

function globToRegExp(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^/]*").replace(/\?/g, "[^/]");
  return new RegExp(`^${escaped}$`);
}

export interface PathspecMatch {
  matched: string[];
  unmatched: string[];
}

/** Expands pathspecs (`.`, exact paths, `dir/`, `*.txt`) against known paths. */
export function expandPathspecs(pathspecs: readonly string[], candidates: Iterable<string>): PathspecMatch {
  const pool = [...new Set(candidates)].sort();
  const matched = new Set<string>();
  const unmatched: string[] = [];

  for (const spec of pathspecs) {
    let hits: string[];
    if (spec === "." || spec === "*" || spec === "./") hits = pool;
    else if (spec.includes("*") || spec.includes("?")) hits = pool.filter((path) => globToRegExp(spec).test(path));
    else {
      const dir = spec.endsWith("/") ? spec : `${spec}/`;
      hits = pool.filter((path) => path === spec || path.startsWith(dir));
    }
    if (hits.length === 0) unmatched.push(spec);
    for (const hit of hits) matched.add(hit);
  }
  return { matched: [...matched].sort(), unmatched };
}
