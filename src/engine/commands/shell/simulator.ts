import { commandHelpLines, overviewLines } from "../shared/help";
import { type CommandContext, type CommandDefinition, defineCommand } from "../types";

function printHelp(ctx: CommandContext, topic: string | undefined, program?: "git") {
  if (!topic) {
    for (const line of overviewLines(ctx.registry, ctx.customCommands, program)) ctx.printSegments(...line.segments);
    return;
  }
  const name = topic.replace(/^git\s+/, "");
  const definition: CommandDefinition | undefined =
    ctx.registry.lookup("git", name) ?? (program ? undefined : ctx.registry.lookup("shell", name));
  if (definition) {
    for (const line of commandHelpLines(definition)) ctx.printSegments(...line.segments);
    return;
  }
  const custom = ctx.customCommands.find((command) => command.name === topic || command.name === `git ${topic}`);
  if (custom) {
    ctx.print(`${custom.name} — ${custom.description || "your custom command"}`, "tag");
    for (const step of custom.steps) ctx.print(`  ${step}`, "info");
    return;
  }
  ctx.fail(`No help found for '${topic}'`, "Run help to list every command.");
}

export const helpCommand = defineCommand({
  program: "shell",
  name: "help",
  category: "simulator",
  summary: "List every command, or explain one",
  usage: ["help", "help <command>"],
  examples: ["help", "help commit"],
  run(ctx: CommandContext) {
    printHelp(ctx, ctx.args.positionals.join(" ") || undefined);
  },
});

export const gitHelpCommand = defineCommand({
  program: "git",
  name: "help",
  category: "simulator",
  summary: "List git commands, or explain one",
  usage: ["git help", "git help <command>"],
  requiresRepo: false,
  run(ctx: CommandContext) {
    printHelp(ctx, ctx.args.positionals[0], "git");
  },
});

export const clearCommand = defineCommand({
  program: "shell",
  name: "clear",
  category: "simulator",
  summary: "Clear the terminal screen",
  usage: ["clear"],
  run(ctx: CommandContext) {
    ctx.effect({ type: "clear-terminal" });
  },
});

export const undoCommand = defineCommand({
  program: "shell",
  name: "undo",
  category: "simulator",
  summary: "Rewind the simulator to before your last command",
  usage: ["undo"],
  description: "Not a Git command — a practice-mode time machine. Real Git undo tools are restore, reset and revert.",
  run(ctx: CommandContext) {
    if (!ctx.standalone) ctx.fail("undo can only be used on its own", "Run undo by itself, not inside a chain or custom command.");
    ctx.effect({ type: "undo" });
  },
});
