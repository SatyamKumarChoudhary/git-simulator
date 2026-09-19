import { type OutputLine, lineOf, seg } from "../../runtime/output";
import type { CommandRegistry } from "../registry";
import { COMMAND_CATEGORIES, type CommandDefinition, type CustomCommand, commandLabel } from "../types";

function optionLabel(key: string, option: NonNullable<CommandDefinition["options"]>[string]): string {
  const names = [option.short && `-${option.short}`, option.long && `--${option.long}`].filter(Boolean).join(", ");
  const value = option.takesValue ? ` <${option.valueName ?? key}>` : "";
  return `${names}${value}`;
}

export function commandHelpLines(definition: CommandDefinition): OutputLine[] {
  const lines: OutputLine[] = [
    { segments: [seg(commandLabel(definition), "accent", true), seg(` — ${definition.summary}`)] },
  ];
  if (definition.description) lines.push(lineOf(definition.description, "muted"));
  lines.push(lineOf(""), lineOf("Usage", "heading"));
  for (const usage of definition.usage) lines.push(lineOf(`  ${usage}`, "info"));

  const options = Object.entries(definition.options ?? {});
  if (options.length > 0) {
    lines.push(lineOf(""), lineOf("Options", "heading"));
    const labels = options.map(([key, option]) => optionLabel(key, option));
    const width = Math.max(...labels.map((label) => label.length)) + 2;
    options.forEach(([, option], i) => {
      lines.push({ segments: [seg(`  ${labels[i].padEnd(width)}`, "branch"), seg(option.description, "muted")] });
    });
  }
  if (definition.examples?.length) {
    lines.push(lineOf(""), lineOf("Examples", "heading"));
    for (const example of definition.examples) lines.push(lineOf(`  $ ${example}`, "success"));
  }
  return lines;
}

export function overviewLines(
  registry: CommandRegistry,
  customCommands: readonly CustomCommand[],
  program?: "git",
): OutputLine[] {
  const lines: OutputLine[] = [
    lineOf(program ? "Git commands available in this simulator" : "Commands you can run", "heading"),
  ];
  const definitions = registry.list(program);

  for (const category of COMMAND_CATEGORIES) {
    const inCategory = definitions.filter((definition) => definition.category === category.id);
    if (inCategory.length === 0) continue;
    lines.push(lineOf(""), lineOf(category.label, "accent"));
    const width = Math.max(...inCategory.map((definition) => commandLabel(definition).length)) + 3;
    for (const definition of inCategory) {
      lines.push({
        segments: [seg(`  ${commandLabel(definition).padEnd(width)}`, "branch"), seg(definition.summary, "muted")],
      });
    }
  }

  if (customCommands.length > 0) {
    lines.push(lineOf(""), lineOf("Your custom commands", "accent"));
    const width = Math.max(...customCommands.map((command) => command.name.length)) + 3;
    for (const command of customCommands) {
      lines.push({
        segments: [
          seg(`  ${command.name.padEnd(width)}`, "tag"),
          seg(command.description || command.steps.join(" && "), "muted"),
        ],
      });
    }
  }

  lines.push(lineOf(""), lineOf("Tip: add --help to any command for details, e.g. git commit --help", "muted"));
  return lines;
}
