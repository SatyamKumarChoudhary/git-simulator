import { CommandError } from "../core/errors";
import type { CommandRegistry } from "../commands/registry";
import type { CustomCommand } from "../commands/types";
import { parseCommandLine } from "../parser/command-line";

export const MAX_CUSTOM_DEPTH = 5;
const NAME_PATTERN = /^(git )?[a-z][a-z0-9-]{0,30}$/;

function quoteIfNeeded(arg: string): string {
  return /[\s"'&;>|]/.test(arg) ? `"${arg.replace(/(["\\])/g, "\\$1")}"` : arg;
}

/** Highest `$N` placeholder referenced by the steps (0 when none). */
export function requiredArgumentCount(steps: readonly string[]): number {
  let max = 0;
  for (const step of steps) for (const match of step.matchAll(/\$([1-9])/g)) max = Math.max(max, Number(match[1]));
  return max;
}

/**
 * Substitutes `$1`..`$9` and `$@`. Inside double quotes the raw value is used;
 * elsewhere values containing spaces are quoted so they stay one argument.
 */
export function expandSteps(command: CustomCommand, args: readonly string[]): string[] {
  const needed = requiredArgumentCount(command.steps);
  if (args.length < needed) {
    throw new CommandError(
      `${command.name}: expected ${needed} argument${needed === 1 ? "" : "s"}, got ${args.length}`,
      `Usage: ${command.name} ${Array.from({ length: needed }, (_, i) => `<arg${i + 1}>`).join(" ")}`,
    );
  }
  return command.steps.map((step) => {
    let inDouble = false;
    let out = "";
    for (let i = 0; i < step.length; i++) {
      const ch = step[i];
      if (ch === '"' && step[i - 1] !== "\\") inDouble = !inDouble;
      if (ch === "$" && step[i + 1] === "@") {
        out += inDouble ? args.join(" ") : args.map(quoteIfNeeded).join(" ");
        i++;
        continue;
      }
      if (ch === "$" && /[1-9]/.test(step[i + 1] ?? "")) {
        const value = args[Number(step[i + 1]) - 1] ?? "";
        out += inDouble ? value : quoteIfNeeded(value);
        i++;
        continue;
      }
      out += ch;
    }
    return out;
  });
}

export interface CustomCommandDraft {
  name: string;
  description: string;
  steps: string[];
}

/** Returns human-readable problems with a custom command (empty when valid). */
export function validateCustomCommand(
  draft: CustomCommandDraft,
  registry: CommandRegistry,
  existing: readonly CustomCommand[],
  editingId?: string,
): string[] {
  const problems: string[] = [];
  const name = draft.name.trim().replace(/\s+/g, " ");

  if (!name) problems.push("Give your command a name, like `save` or `git save`.");
  else if (!NAME_PATTERN.test(name)) {
    problems.push("Names must be lowercase letters, numbers or dashes — optionally starting with `git ` (e.g. `git save`).");
  } else {
    const [first, second] = name.split(" ");
    const builtin = second ? registry.has("git", second) : registry.has("shell", first) || first === "git";
    if (builtin) problems.push(`\`${name}\` is already a built-in command. Pick a different name.`);
    if (existing.some((command) => command.name === name && command.id !== editingId)) {
      problems.push(`You already have a custom command called \`${name}\`.`);
    }
  }

  const steps = draft.steps.map((step) => step.trim()).filter(Boolean);
  if (steps.length === 0) problems.push("Add at least one step (one command per line).");
  steps.forEach((step, i) => {
    try {
      parseCommandLine(step.replace(/\$[1-9@]/g, "x"));
    } catch (error) {
      problems.push(`Step ${i + 1}: ${(error as Error).message}`);
    }
  });
  if (steps.some((step) => step.split(/\s+/)[0] === "undo")) problems.push("Steps can't use `undo`.");
  return problems;
}
