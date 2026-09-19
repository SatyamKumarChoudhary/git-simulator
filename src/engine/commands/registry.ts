import { closestMatch } from "../core/utils";
import { type CommandDefinition, type CommandProgram, commandLabel } from "./types";

/**
 * The single source of truth for which commands exist. Add a command by
 * writing a module with `defineCommand(...)` and registering it.
 */
export class CommandRegistry {
  private readonly commands = new Map<string, CommandDefinition>();

  register(definition: CommandDefinition): this {
    const key = this.key(definition.program, definition.name);
    if (this.commands.has(key)) {
      throw new Error(`Command "${commandLabel(definition)}" is already registered`);
    }
    this.commands.set(key, definition);
    return this;
  }

  registerAll(definitions: Iterable<CommandDefinition>): this {
    for (const definition of definitions) this.register(definition);
    return this;
  }

  lookup(program: CommandProgram, name: string): CommandDefinition | undefined {
    return this.commands.get(this.key(program, name));
  }

  has(program: CommandProgram, name: string): boolean {
    return this.commands.has(this.key(program, name));
  }

  list(program?: CommandProgram): CommandDefinition[] {
    return [...this.commands.values()].filter((definition) => !program || definition.program === program);
  }

  names(program: CommandProgram): string[] {
    return this.list(program).map((definition) => definition.name);
  }

  suggest(program: CommandProgram, name: string, extra: Iterable<string> = []): string | null {
    return closestMatch(name, [...this.names(program), ...extra]);
  }

  private key(program: CommandProgram, name: string): string {
    return `${program}:${name}`;
  }
}
