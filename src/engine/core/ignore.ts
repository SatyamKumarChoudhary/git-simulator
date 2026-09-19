import type { RepoState } from "./types";
import { own } from "./utils";

export const IGNORE_FILE = ".gitignore";

function globToRegExp(glob: string): RegExp {
  let pattern = "";
  for (let i = 0; i < glob.length; i++) {
    const ch = glob[i];
    if (ch === "*" && glob[i + 1] === "*") {
      pattern += ".*";
      i++;
    } else if (ch === "*") pattern += "[^/]*";
    else if (ch === "?") pattern += "[^/]";
    else pattern += ch.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${pattern}$`);
}

/** Patterns from the working directory's .gitignore (blank lines, comments and negations are skipped). */
export function ignorePatterns(state: RepoState): string[] {
  const content = own(state.workdir, IGNORE_FILE);
  if (!content) return [];
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && !line.startsWith("!"));
}

/** Whether .gitignore matches `path`. Tracked files are never ignored — check that separately. */
export function isIgnored(state: RepoState, path: string, patterns = ignorePatterns(state)): boolean {
  if (path === IGNORE_FILE) return false;
  const segments = path.split("/");
  return patterns.some((raw) => {
    const anchored = raw.startsWith("/");
    const pattern = raw.replace(/^\//, "");
    if (pattern.endsWith("/")) {
      const dir = pattern.slice(0, -1);
      return anchored ? path.startsWith(`${dir}/`) : path.startsWith(`${dir}/`) || segments.slice(0, -1).includes(dir);
    }
    const regex = globToRegExp(pattern);
    if (anchored || pattern.includes("/")) return regex.test(path);
    return segments.some((segment) => regex.test(segment));
  });
}
