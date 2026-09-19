import type { CommandRegistry } from "../commands/registry";
import type { CustomCommand } from "../commands/types";
import type { RepoState } from "../core/types";

export interface Completion {
  /** The partial word being completed. */
  prefix: string;
  /** Full words that match the prefix. */
  candidates: string[];
  /** The input with the longest shared completion applied. */
  completed: string;
}

function commonPrefix(words: string[]): string {
  if (words.length === 0) return "";
  let prefix = words[0];
  for (const word of words.slice(1)) {
    while (!word.startsWith(prefix)) prefix = prefix.slice(0, -1);
  }
  return prefix;
}

/** Tab-completion for commands, subcommands, options, branches, tags and files. */
export function complete(
  input: string,
  state: RepoState,
  registry: CommandRegistry,
  customCommands: readonly CustomCommand[] = [],
): Completion {
  const chain = input.lastIndexOf("&&");
  const segmentStart = Math.max(chain === -1 ? 0 : chain + 2, input.lastIndexOf(";") + 1);
  const segment = input.slice(segmentStart).replace(/^\s+/, "");
  const words = segment.split(/\s+/);
  const prefix = words[words.length - 1] ?? "";
  const before = words.slice(0, -1);

  let pool: string[];
  if (before.length === 0) {
    pool = ["git", ...registry.names("shell"), ...customCommands.filter((c) => !c.name.startsWith("git ")).map((c) => c.name)];
  } else if (before[0] === "git" && before.length === 1) {
    pool = [
      ...registry.names("git"),
      ...customCommands.filter((c) => c.name.startsWith("git ")).map((c) => c.name.slice(4)),
    ];
  } else if (prefix.startsWith("-")) {
    const definition = before[0] === "git" ? registry.lookup("git", before[1]) : registry.lookup("shell", before[0]);
    pool = Object.values(definition?.options ?? {}).flatMap((option) => [
      ...(option.long ? [`--${option.long}`] : []),
      ...(option.short ? [`-${option.short}`] : []),
    ]);
  } else {
    pool = [
      ...Object.keys(state.branches),
      ...Object.keys(state.tags),
      ...Object.keys(state.remotes),
      ...Object.keys(state.remoteRefs),
      ...(state.initialized ? ["HEAD"] : []),
      ...Object.keys(state.workdir),
      ...Object.keys(state.index).filter((path) => !Object.hasOwn(state.workdir, path)),
    ];
  }

  const candidates = [...new Set(pool)].filter((word) => word.startsWith(prefix)).sort();
  const shared = commonPrefix(candidates);
  let completed = input;
  if (shared.length > prefix.length) {
    completed = input.slice(0, input.length - prefix.length) + shared + (candidates.length === 1 ? " " : "");
  } else if (candidates.length === 1 && candidates[0] === prefix && prefix !== "") {
    completed = `${input} `;
  }
  return { prefix, candidates, completed };
}
