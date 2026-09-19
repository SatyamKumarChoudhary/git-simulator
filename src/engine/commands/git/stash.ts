import { shortId } from "../../core/refs";
import { currentBranch, getCommit, headTree } from "../../core/repo";
import { computeStatus, mergeTrees } from "../../core/tree";
import type { FileTree, StashEntry } from "../../core/types";
import { own, sortedUnion } from "../../core/utils";
import { optionValue } from "../../parser/args";
import { requireHeadCommit, requireNoMerge } from "../shared/guards";
import { type CommandContext, defineCommand } from "../types";

function stashIndex(ctx: CommandContext, ref: string | undefined): number {
  if (ctx.state.stash.length === 0) ctx.fail("error: No stash entries found.", "There's nothing stashed. Save work with git stash first.");
  if (!ref) return 0;
  const match = /^(?:stash@\{)?(\d+)\}?$/.exec(ref);
  const index = match ? Number(match[1]) : -1;
  if (index < 0 || index >= ctx.state.stash.length) {
    ctx.fail(`error: ${ref} is not a valid reference`, `Run git stash list — valid entries are stash@{0} to stash@{${ctx.state.stash.length - 1}}.`);
  }
  return index;
}

function push(ctx: CommandContext) {
  const state = ctx.state;
  requireNoMerge(ctx, "Stashing");
  const headId = requireHeadCommit(ctx);
  const status = computeStatus(state);
  if (status.staged.length === 0 && status.unstaged.length === 0) {
    ctx.print("No local changes to save");
    ctx.narrate({ icon: "🤷", title: "Nothing to stash", body: "There are no changes to tracked files. (New, untracked files are never stashed by default.)" });
    return;
  }

  const committed = headTree(state);
  const paths = sortedUnion(Object.keys(state.index), Object.keys(committed));
  const workdir: FileTree = {};
  for (const path of paths) {
    const content = own(state.workdir, path);
    if (content !== undefined) workdir[path] = content;
  }
  const where = currentBranch(state) ?? "(no branch)";
  const message = optionValue(ctx.args, "message") ?? `WIP on ${where}: ${shortId(headId)} ${getCommit(state, headId).message}`;
  const entry: StashEntry = { message, base: headId, index: { ...state.index }, workdir, paths };

  for (const path of paths) {
    const content = own(committed, path);
    if (content === undefined) {
      delete state.index[path];
      delete state.workdir[path];
    } else {
      state.index[path] = content;
      state.workdir[path] = content;
    }
  }
  state.stash.unshift(entry);
  ctx.print(`Saved working directory and index state ${message}`);
  ctx.emit({ type: "stashed" });
  ctx.narrate({
    icon: "🧳",
    title: "Work stashed",
    body: "Your uncommitted changes were packed away and the files went back to the last commit. You can now switch branches safely — bring the work back later with git stash pop.",
  });
}

function apply(ctx: CommandContext, remove: boolean) {
  const state = ctx.state;
  requireNoMerge(ctx, "Applying a stash");
  requireHeadCommit(ctx);
  const index = stashIndex(ctx, ctx.args.positionals[1]);
  const entry = state.stash[index];
  const base = getCommit(state, entry.base).tree;
  const current = headTree(state);

  const stashed: FileTree = { ...entry.workdir };

  const changed = sortedUnion(Object.keys(base), Object.keys(stashed)).filter((path) => own(base, path) !== own(stashed, path));
  const blocked = changed.filter((path) => own(state.index, path) !== own(current, path) || own(state.workdir, path) !== own(state.index, path));
  if (blocked.length > 0) {
    ctx.fail(
      `error: Your local changes to the following files would be overwritten by merge:\n${blocked.map((path) => `\t${path}`).join("\n")}\nAborting`,
      "Commit or discard your current edits before bringing the stash back.",
    );
  }

  const merged = mergeTrees(base, current, stashed, { ours: "Updated upstream", theirs: "Stashed changes" });
  if (merged.conflicts.length > 0) {
    ctx.fail(
      `CONFLICT (content): Merge conflict in ${merged.conflicts.join(", ")}`,
      "The stashed changes clash with commits made since. The simulator doesn't support stash conflicts — try applying it on the branch you stashed from.",
    );
  }

  for (const path of changed) {
    const content = own(merged.tree, path);
    if (content === undefined) delete state.workdir[path];
    else state.workdir[path] = content;
    // Files that were newly added (staged) when stashed come back staged.
    if (own(base, path) === undefined && own(entry.index, path) !== undefined && content !== undefined) state.index[path] = content;
  }

  if (remove) {
    state.stash.splice(index, 1);
    ctx.print(`Dropped refs/stash@{${index}}`, "muted");
  }
  ctx.emit({ type: "stash-applied" });
  ctx.narrate({
    icon: "🎁",
    title: remove ? "Stash popped" : "Stash applied",
    body: `Your saved changes are back in the working directory${remove ? " and the stash entry was removed" : " (the entry is still in the stash list)"}. Carry on where you left off!`,
  });
}

export const stashCommand = defineCommand({
  program: "git",
  name: "stash",
  category: "undo",
  summary: "Set uncommitted work aside and bring it back later",
  usage: ["git stash", "git stash list", "git stash pop", "git stash apply", "git stash drop"],
  description: "Perfect when you need a clean working directory right now — to switch branches or pull — without committing half-done work.",
  examples: ["git stash", 'git stash push -m "half-done footer"', "git stash pop"],
  options: {
    message: { short: "m", long: "message", takesValue: true, valueName: "message", description: "Describe the stash" },
  },
  run(ctx: CommandContext) {
    const state = ctx.state;
    const [action = "push"] = ctx.args.positionals;
    switch (action) {
      case "push":
      case "save":
        return push(ctx);
      case "list":
        if (state.stash.length === 0) ctx.print("(the stash is empty)", "muted");
        state.stash.forEach((entry, i) => ctx.printSegments({ text: `stash@{${i}}`, tone: "tag" }, { text: `: ${entry.message}` }));
        return;
      case "pop":
        return apply(ctx, true);
      case "apply":
        return apply(ctx, false);
      case "drop": {
        const index = stashIndex(ctx, ctx.args.positionals[1]);
        const [dropped] = state.stash.splice(index, 1);
        ctx.print(`Dropped stash@{${index}} (${dropped.message})`);
        return;
      }
      case "clear":
        state.stash = [];
        return;
      default:
        ctx.fail(`error: unknown subcommand: ${action}`, "Try git stash, git stash list, git stash pop, git stash apply or git stash drop.");
    }
  },
});
