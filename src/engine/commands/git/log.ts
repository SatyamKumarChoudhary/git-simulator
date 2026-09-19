import { ancestors, newestFirst, refTips } from "../../core/graph";
import { resolveRevision, shortId } from "../../core/refs";
import { pluralize } from "../../core/utils";
import { flag, optionValue } from "../../parser/args";
import { seg } from "../../runtime/output";
import { decorationSegments, printOneline } from "../shared/format";
import { requireHeadCommit } from "../shared/guards";
import { type CommandContext, defineCommand } from "../types";

export const logCommand = defineCommand({
  program: "git",
  name: "log",
  category: "inspect",
  summary: "Show the commit history",
  usage: ["git log", "git log --oneline", "git log --oneline --all", "git log -n 3 <branch>"],
  examples: ["git log --oneline", "git log --oneline --all", "git log -3"],
  options: {
    oneline: { long: "oneline", description: "One line per commit" },
    all: { long: "all", description: "Show commits from every branch and tag" },
    count: { short: "n", long: "max-count", takesValue: true, valueName: "number", description: "Limit the number of commits" },
    graph: { long: "graph", description: "Accepted for compatibility — the graph is drawn on the right!" },
  },
  run(ctx: CommandContext) {
    const state = ctx.state;
    const starts = flag(ctx.args, "all")
      ? refTips(state)
      : ctx.args.positionals.length > 0
        ? ctx.args.positionals.map((revision) => resolveRevision(state, revision))
        : [requireHeadCommit(ctx)];

    if (starts.length === 0) requireHeadCommit(ctx);

    const reachable = new Set<string>();
    for (const start of starts) for (const id of ancestors(state, start)) reachable.add(id);

    const limitText = optionValue(ctx.args, "count");
    const limit = limitText === undefined ? Infinity : Number(limitText);
    if (Number.isNaN(limit) || limit < 0) ctx.fail(`fatal: '${limitText}': not a number`, "Use a whole number, like git log -n 3");

    const commits = newestFirst(state, reachable).slice(0, limit);
    const oneline = flag(ctx.args, "oneline");

    commits.forEach((commit, i) => {
      if (oneline) {
        printOneline(ctx, commit);
        return;
      }
      if (i > 0) ctx.print("");
      ctx.printSegments(seg(`commit ${commit.id}`, "hash"), ...decorationSegments(state, commit.id));
      if (commit.parents.length > 1) ctx.print(`Merge: ${commit.parents.map(shortId).join(" ")}`);
      ctx.print(`Author: ${commit.author}`);
      ctx.print("");
      ctx.print(`    ${commit.message}`);
    });

    ctx.narrate({
      icon: "📜",
      title: "Reading history",
      body: `Showing ${pluralize(commits.length, "commit")}, newest first. Each commit points back to its parent — that chain of arrows is your history (drawn left → right in the graph).`,
    });
  },
});
