import { shortId, tryResolveRevision } from "../../core/refs";
import { currentBranch, getCommit } from "../../core/repo";
import { own } from "../../core/utils";
import { optionValue } from "../../parser/args";
import { sideOption, takeConflictSide } from "../shared/conflicts";
import { requireNoMerge } from "../shared/guards";
import { expandPathspecs } from "../shared/paths";
import { detachHeadAt, narrateDetached, switchToBranch, trackRemoteBranch } from "../shared/worktree";
import { type CommandContext, defineCommand } from "../types";
import { createAndSwitch } from "./switch";

function restoreFromIndex(ctx: CommandContext, specs: readonly string[]) {
  const state = ctx.state;
  const { matched, unmatched } = expandPathspecs(specs, Object.keys(state.index));
  if (unmatched.length > 0) {
    ctx.fail(
      `error: pathspec '${unmatched[0]}' did not match any file(s) known to git`,
      `'${unmatched[0]}' isn't a branch, a commit, or a tracked file.`,
    );
  }
  const discarded = matched.filter((path) => own(state.workdir, path) !== state.index[path]);
  for (const path of discarded) state.workdir[path] = state.index[path];
  if (discarded.length > 0) ctx.emit({ type: "discarded", paths: discarded });
  ctx.print(`Updated ${discarded.length} path${discarded.length === 1 ? "" : "s"} from the index`);
  ctx.narrate({
    icon: "🧽",
    title: "Changes discarded",
    body: "The files were overwritten with the version in the staging area. Tip: modern Git uses git restore <file> for this.",
  });
}

export const checkoutCommand = defineCommand({
  program: "git",
  name: "checkout",
  category: "branching",
  summary: "Switch branches, visit a commit, or discard file changes",
  usage: ["git checkout <branch>", "git checkout -b <new-branch>", "git checkout <commit>", "git checkout -- <file>", "git checkout --ours|--theirs <file>"],
  description: "The classic Swiss-army knife. Newer Git splits it into git switch (branches) and git restore (files).",
  examples: ["git checkout main", "git checkout -b feature", "git checkout HEAD~1", "git checkout -- notes.txt", "git checkout --theirs index.html"],
  options: {
    branch: { short: "b", takesValue: true, valueName: "new-branch", description: "Create a new branch and switch to it" },
    ours: { long: "ours", description: "During a merge conflict: keep your branch's version of the file" },
    theirs: { long: "theirs", description: "During a merge conflict: take the merged branch's version of the file" },
  },
  run(ctx: CommandContext) {
    const state = ctx.state;
    const created = optionValue(ctx.args, "branch");
    const [target] = ctx.args.positionals;
    const side = sideOption(ctx);
    if (side) return takeConflictSide(ctx, side, [...ctx.args.positionals, ...(ctx.args.paths ?? [])]);

    if (ctx.args.paths && ctx.args.paths.length > 0 && !created && !target) {
      return restoreFromIndex(ctx, ctx.args.paths);
    }

    requireNoMerge(ctx, "Checking out");
    if (created) return createAndSwitch(ctx, created, target, "checkout");
    if (!target) ctx.fail("fatal: you must specify a branch, commit or file", "Try git checkout <branch>");

    if (own(state.branches, target) !== undefined) {
      if (currentBranch(state) === target) {
        ctx.print(`Already on '${target}'`);
        return;
      }
      switchToBranch(ctx, target, "checkout");
      ctx.print(`Switched to branch '${target}'`);
      ctx.narrate({
        icon: "🚂",
        title: `HEAD → ${target}`,
        body: `HEAD now points at '${target}' and your files match its latest commit ${shortId(state.branches[target])}.`,
      });
      return;
    }

    // `git checkout design` when only origin/design exists: same shortcut as git switch.
    if (trackRemoteBranch(ctx, target, "checkout")) return;

    const id = tryResolveRevision(state, target);
    if (id) {
      detachHeadAt(ctx, id, "checkout", target);
      ctx.print(`Note: switching to '${target}'.`, "warning");
      ctx.print("");
      ctx.print("You are in 'detached HEAD' state. You can look around, make experimental");
      ctx.print("changes and commit them, and you can discard any commits you make in this");
      ctx.print("state without impacting any branches by switching back to a branch.");
      ctx.print("");
      ctx.print(`HEAD is now at ${shortId(id)} ${getCommit(state, id).message}`);
      narrateDetached(ctx, id);
      return;
    }

    return restoreFromIndex(ctx, ctx.args.positionals);
  },
});
