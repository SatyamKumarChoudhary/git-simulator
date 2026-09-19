import { own } from "../../core/utils";
import { flag } from "../../parser/args";
import { type CommandContext, defineCommand } from "../types";

const KNOWN_KEYS = new Set(["user.name", "user.email", "core.editor", "init.defaultbranch", "pull.rebase"]);

export const configCommand = defineCommand({
  program: "git",
  name: "config",
  category: "setup",
  summary: "Read or set settings such as your name and email",
  usage: ["git config user.name \"<name>\"", "git config user.email \"<email>\"", "git config --list"],
  examples: ['git config --global user.name "Ada Lovelace"', "git config user.name"],
  requiresRepo: false,
  options: {
    global: { long: "global", description: "Apply to all your repositories (simulated)" },
    list: { short: "l", long: "list", description: "Show every setting" },
  },
  run(ctx: CommandContext) {
    const { positionals } = ctx.args;
    const config = ctx.state.config;

    if (flag(ctx.args, "list") || positionals.length === 0) {
      const entries = Object.entries(config);
      if (entries.length === 0) ctx.print("(no settings yet)", "muted");
      for (const [key, value] of entries) ctx.print(`${key}=${value}`);
      return;
    }

    const key = positionals[0].toLowerCase();
    if (!/^[a-z][\w-]*\.[a-z][\w.-]*$/.test(key)) {
      ctx.fail(`error: key does not contain a section: ${positionals[0]}`, "Config keys look like section.name, e.g. user.name");
    }
    if (positionals.length === 1) {
      const value = own(config, key);
      if (value === undefined) ctx.fail(`(no value set for ${key})`, `Set it with: git config ${key} "value"`);
      ctx.print(value);
      return;
    }

    config[key] = positionals.slice(1).join(" ");
    ctx.narrate({
      icon: "🪪",
      title: `Setting saved: ${key}`,
      body: KNOWN_KEYS.has(key) && key.startsWith("user.")
        ? "Git stamps your name and email onto every commit you make, so teammates know who changed what."
        : `Git will remember ${key} = "${config[key]}".`,
    });
  },
});
