import { addCommand } from "./git/add";
import { branchCommand } from "./git/branch";
import { checkoutCommand } from "./git/checkout";
import { commitCommand } from "./git/commit";
import { configCommand } from "./git/config";
import { diffCommand, showCommand } from "./git/diff";
import { initCommand } from "./git/init";
import { logCommand } from "./git/log";
import { mergeCommand } from "./git/merge";
import { resetCommand } from "./git/reset";
import { restoreCommand } from "./git/restore";
import { cherryPickCommand, rebaseCommand, reflogCommand, revertCommand } from "./git/rewrite";
import { cloneCommand, fetchCommand, pullCommand, pushCommand, remoteCommand } from "./git/remote";
import { gitRmCommand } from "./git/rm";
import { gitMvCommand } from "./git/mv";
import { stashCommand } from "./git/stash";
import { statusCommand } from "./git/status";
import { switchCommand } from "./git/switch";
import { tagCommand } from "./git/tag";
import { CommandRegistry } from "./registry";
import { catCommand, echoCommand, editCommand, lsCommand, rmCommand, touchCommand } from "./shell/files";
import { serverCommand } from "./shell/server";
import { clearCommand, gitHelpCommand, helpCommand, undoCommand } from "./shell/simulator";
import type { CommandDefinition } from "./types";

/**
 * Every built-in command. To add a new one: create a module that exports
 * `defineCommand({...})` and append it here — the terminal, help, autocomplete
 * and command reference pick it up automatically.
 */
export const builtinCommands: readonly CommandDefinition[] = [
  initCommand,
  configCommand,
  statusCommand,
  addCommand,
  commitCommand,
  gitRmCommand,
  gitMvCommand,
  logCommand,
  diffCommand,
  showCommand,
  branchCommand,
  switchCommand,
  checkoutCommand,
  tagCommand,
  mergeCommand,
  restoreCommand,
  resetCommand,
  revertCommand,
  reflogCommand,
  stashCommand,
  cherryPickCommand,
  rebaseCommand,
  remoteCommand,
  cloneCommand,
  fetchCommand,
  pullCommand,
  pushCommand,
  gitHelpCommand,
  helpCommand,
  lsCommand,
  catCommand,
  touchCommand,
  echoCommand,
  editCommand,
  rmCommand,
  clearCommand,
  undoCommand,
  serverCommand,
];

export function createDefaultRegistry(): CommandRegistry {
  return new CommandRegistry().registerAll(builtinCommands);
}
