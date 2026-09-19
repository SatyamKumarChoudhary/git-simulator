import { DEFAULT_BRANCH, REPO_PATH } from "../../core/constants";
import { type CommandContext, defineCommand } from "../types";

export const initCommand = defineCommand({
  program: "git",
  name: "init",
  category: "setup",
  summary: "Turn the current folder into a Git repository",
  usage: ["git init"],
  description: "Creates the hidden .git folder where Git stores every snapshot, branch and pointer.",
  examples: ["git init"],
  requiresRepo: false,
  run(ctx: CommandContext) {
    const state = ctx.state;
    if (state.initialized) {
      ctx.print(`Reinitialized existing Git repository in ${REPO_PATH}/.git/`);
      ctx.narrate({
        icon: "♻️",
        title: "Already a repository",
        body: "This folder was already a Git repository. Running git init again is harmless — nothing was lost.",
      });
      return;
    }

    state.initialized = true;
    state.head = { kind: "branch", name: DEFAULT_BRANCH };
    state.index = {};
    ctx.print(`Initialized empty Git repository in ${REPO_PATH}/.git/`, "success");
    ctx.emit({ type: "repo-init" });

    const fileCount = Object.keys(state.workdir).length;
    ctx.narrate({
      icon: "🎉",
      title: "A repository is born",
      body: `Git created its hidden .git folder — the project's memory. The staging area and repository just switched on, and HEAD points at an empty '${DEFAULT_BRANCH}' branch.${
        fileCount > 0 ? ` Your ${fileCount} existing file(s) are untracked until you git add them.` : ""
      }`,
    });
  },
});
