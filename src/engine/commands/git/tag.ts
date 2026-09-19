import { refNameProblem, resolveRevision, shortId } from "../../core/refs";
import { own } from "../../core/utils";
import { flag } from "../../parser/args";
import { type CommandContext, defineCommand } from "../types";

export const tagCommand = defineCommand({
  program: "git",
  name: "tag",
  category: "branching",
  summary: "Put a permanent name tag on a commit (like v1.0)",
  usage: ["git tag", "git tag <name> [<commit>]", "git tag -d <name>"],
  description: "Unlike branches, tags never move. They're perfect for marking releases.",
  examples: ["git tag v1.0", "git tag beta HEAD~2", "git tag -d beta"],
  options: {
    delete: { short: "d", long: "delete", description: "Delete a tag" },
  },
  run(ctx: CommandContext) {
    const state = ctx.state;
    const [name, target] = ctx.args.positionals;

    if (flag(ctx.args, "delete")) {
      if (!name) ctx.fail("fatal: tag name required", "Usage: git tag -d <name>");
      const at = own(state.tags, name);
      if (at === undefined) ctx.fail(`error: tag '${name}' not found.`, "Run git tag to list tags.");
      delete state.tags[name];
      ctx.print(`Deleted tag '${name}' (was ${shortId(at)})`);
      ctx.emit({ type: "tag-deleted", name });
      return;
    }

    if (!name) {
      for (const tag of Object.keys(state.tags).sort()) ctx.print(tag, "tag");
      if (Object.keys(state.tags).length === 0) ctx.print("(no tags yet)", "muted");
      return;
    }

    const problem = refNameProblem(name);
    if (problem) ctx.fail(`fatal: ${problem}`, "Tag names are usually versions like v1.0 or v2.3.1.");
    if (own(state.tags, name) !== undefined) ctx.fail(`fatal: tag '${name}' already exists`, "Tags are permanent. Delete it with git tag -d first if you really need to move it.");

    const at = resolveRevision(state, target ?? "HEAD");
    state.tags[name] = at;
    ctx.emit({ type: "tag-created", name, at });
    ctx.narrate({
      icon: "🏷️",
      title: `Tagged ${shortId(at)} as ${name}`,
      body: "A tag is a label that never moves — even when new commits arrive. Great for marking releases.",
    });
  },
});
