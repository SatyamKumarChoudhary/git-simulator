import { own } from "../../core/utils";
import { flag } from "../../parser/args";
import { expandPathspecs } from "../shared/paths";
import { type CommandContext, defineCommand } from "../types";

export const gitRmCommand = defineCommand({
  program: "git",
  name: "rm",
  category: "snapshots",
  summary: "Delete files and stage the deletion",
  usage: ["git rm <file>...", "git rm --cached <file>..."],
  examples: ["git rm old.txt", "git rm --cached secrets.env"],
  options: {
    cached: { long: "cached", description: "Only remove from the staging area (keep the file on disk)" },
  },
  run(ctx: CommandContext) {
    const state = ctx.state;
    const specs = [...ctx.args.positionals, ...(ctx.args.paths ?? [])];
    if (specs.length === 0) ctx.fail("usage: git rm [--cached] <file>...", "Name the file(s) to remove.");

    const { matched, unmatched } = expandPathspecs(specs, Object.keys(state.index));
    if (unmatched.length > 0) {
      ctx.fail(`fatal: pathspec '${unmatched[0]}' did not match any files`, `'${unmatched[0]}' isn't tracked by Git, so there's nothing to git rm. Use plain rm for untracked files.`);
    }

    const cached = flag(ctx.args, "cached");
    for (const path of matched) {
      delete state.index[path];
      if (!cached && own(state.workdir, path) !== undefined) {
        delete state.workdir[path];
        ctx.emit({ type: "file-removed", path });
      }
      ctx.print(`rm '${path}'`);
    }
    ctx.emit({ type: "staged", paths: matched });
    ctx.narrate({
      icon: "🗑️",
      title: cached ? "Untracked, but kept on disk" : "Deletion staged",
      body: cached
        ? `${matched.join(", ")} will be removed from the repository in the next commit, but the file stays in your folder (now untracked).`
        : `${matched.join(", ")} ${matched.length === 1 ? "was" : "were"} deleted and the deletion is staged for the next commit.`,
    });
  },
});
