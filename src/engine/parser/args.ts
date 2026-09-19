import type { OptionDefinition, ParsedArgs } from "../commands/types";
import { CommandError } from "../core/errors";

/**
 * Parses argv against a command's option spec. Supports `-m value`, `-mvalue`,
 * combined switches (`-am "msg"`), `--long`, `--long=value`, `--long value`,
 * `-3` as shorthand for `-n 3`, and `--` to separate paths.
 */
export function parseArgs(
  argv: readonly string[],
  spec: Record<string, OptionDefinition> = {},
  label: string,
): ParsedArgs {
  const byShort = new Map<string, string>();
  const byLong = new Map<string, string>();
  for (const [key, option] of Object.entries(spec)) {
    if (option.short) byShort.set(option.short, key);
    if (option.long) byLong.set(option.long, key);
  }

  const usageHint = `Run \`${label} --help\` to see the options it understands.`;
  const positionals: string[] = [];
  const options: Record<string, string | true> = {};
  let paths: string[] | null = null;

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];

    if (paths) {
      paths.push(token);
      continue;
    }
    if (token === "--") {
      paths = [];
      continue;
    }

    if (token.startsWith("--")) {
      const eq = token.indexOf("=");
      const name = eq === -1 ? token.slice(2) : token.slice(2, eq);
      const key = byLong.get(name);
      if (!key) throw new CommandError(`error: unknown option '${name}'`, usageHint);
      if (spec[key].takesValue) {
        const value = eq !== -1 ? token.slice(eq + 1) : argv[++i];
        if (value === undefined) throw new CommandError(`error: option '${name}' requires a value`, usageHint);
        options[key] = value;
      } else {
        if (eq !== -1) throw new CommandError(`error: option '${name}' takes no value`, usageHint);
        options[key] = true;
      }
      continue;
    }

    if (/^-\d+$/.test(token) && byShort.has("n")) {
      options[byShort.get("n")!] = token.slice(1);
      continue;
    }

    if (token.startsWith("-") && token.length > 1) {
      const letters = token.slice(1);
      for (let j = 0; j < letters.length; j++) {
        const key = byShort.get(letters[j]);
        if (!key) throw new CommandError(`error: unknown switch '${letters[j]}'`, usageHint);
        if (spec[key].takesValue) {
          const rest = letters.slice(j + 1);
          const value = rest !== "" ? rest : argv[++i];
          if (value === undefined) {
            throw new CommandError(`error: switch '${letters[j]}' requires a value`, usageHint);
          }
          options[key] = value;
          break;
        }
        options[key] = true;
      }
      continue;
    }

    positionals.push(token);
  }

  return { positionals, options, paths };
}

export function flag(args: ParsedArgs, key: string): boolean {
  return args.options[key] !== undefined;
}

export function optionValue(args: ParsedArgs, key: string): string | undefined {
  const value = args.options[key];
  return typeof value === "string" ? value : undefined;
}
