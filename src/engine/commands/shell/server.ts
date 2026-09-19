import { createCommit } from "../../core/repo";
import { refNameProblem, shortId } from "../../core/refs";
import { own } from "../../core/utils";
import { optionValue } from "../../parser/args";
import { assertValidPath } from "../shared/paths";
import { TEAMMATE, ensureServer, isUrl, requireServer } from "../shared/remote";
import { type CommandContext, defineCommand } from "../types";

/**
 * Simulator-only: plays the part of GitHub and your teammates.
 * Levels use it to set the scene (a repo to clone, a teammate's push…).
 */
export const serverCommand = defineCommand({
  program: "shell",
  name: "server",
  category: "simulator",
  summary: "Simulate GitHub: create a hosted repo or a teammate's pushed commit",
  usage: ["server create <url>", 'server commit <url> "<message>" [--file <path>] [--content "<text>"] [--branch <name>]'],
  description: "Not a Git command. It lets you practise clone, fetch, pull and push without a real server.",
  examples: ["server create https://github.com/team/site", 'server commit https://github.com/team/site "Update README" --file README.md'],
  options: {
    file: { short: "f", long: "file", takesValue: true, valueName: "path", description: "File the teammate changes (default TEAM.md)" },
    content: { short: "c", long: "content", takesValue: true, valueName: "text", description: "New file content (default: append the message)" },
    branch: { short: "b", long: "branch", takesValue: true, valueName: "name", description: "Branch to commit to (default: the repo's default branch)" },
  },
  run(ctx: CommandContext) {
    const state = ctx.state;
    const [action, url, message] = ctx.args.positionals;
    if (!action || !url) ctx.fail("usage: server create <url> | server commit <url> \"<message>\"", "Run server --help for details.");
    if (!isUrl(url)) ctx.fail(`'${url}' does not look like a repository URL`, "Use something like https://github.com/team/site");

    if (action === "create") {
      const existed = own(state.servers, url) !== undefined;
      ensureServer(state, url);
      ctx.print(existed ? `(simulated) ${url} already exists` : `(simulated) created empty repository ${url}`, "muted");
      return;
    }

    if (action === "commit") {
      if (!message) ctx.fail("server commit needs a message", 'Example: server commit <url> "Update README"');
      const server = requireServer(ctx, url);
      const branch = optionValue(ctx.args, "branch") ?? server.defaultBranch;
      const problem = refNameProblem(branch);
      if (problem) ctx.fail(problem);
      const path = optionValue(ctx.args, "file") ?? "TEAM.md";
      assertValidPath(path);

      const tip = own(server.branches, branch);
      const tree = { ...(tip ? server.commits[tip].tree : {}) };
      const existing = own(tree, path);
      tree[path] = optionValue(ctx.args, "content")?.replace(/\\n/g, "\n") ?? (existing ? `${existing}\n${message}` : message);
      const commit = createCommit(state, { message, parents: tip ? [tip] : [], tree, author: TEAMMATE }, server.commits);
      server.branches[branch] = commit.id;

      ctx.print(`(simulated) a teammate pushed ${shortId(commit.id)} "${message}" to ${branch}`, "muted");
      ctx.emit({ type: "remote-sync", direction: "teammate", ref: branch });
      ctx.narrate({
        icon: "🧑‍💻",
        title: "A teammate pushed a commit",
        body: `The remote's ${branch} moved forward, but your repository doesn't know yet. Use git fetch or git pull to get it.`,
      });
      return;
    }

    ctx.fail(`unknown server action '${action}'`, "Use server create or server commit.");
  },
});
