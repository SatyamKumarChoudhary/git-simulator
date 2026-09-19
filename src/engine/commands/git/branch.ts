import { isAncestor } from "../../core/graph";
import { refNameProblem, resolveRevision, shortId } from "../../core/refs";
import { currentBranch, headCommitId } from "../../core/repo";
import { own } from "../../core/utils";
import { flag } from "../../parser/args";
import { seg } from "../../runtime/output";
import { type CommandContext, defineCommand } from "../types";

export function assertNewBranchName(ctx: CommandContext, name: string): void {
  const problem = refNameProblem(name);
  if (problem) ctx.fail(`fatal: ${problem}`, "Branch names can't contain spaces or special characters. Try something like feature/login.");
  if (own(ctx.state.branches, name) !== undefined) {
    ctx.fail(`fatal: a branch named '${name}' already exists`, `Switch to it with git switch ${name}, or pick a different name.`);
  }
}

function listBranches(ctx: CommandContext, mode: "local" | "remote" | "all" = "local") {
  const state = ctx.state;
  if (mode === "remote") {
    const refs = Object.keys(state.remoteRefs).sort();
    if (refs.length === 0) ctx.print("(no remote-tracking branches — try git fetch)", "muted");
    for (const ref of refs) ctx.print(`  ${ref}`, "removed");
    return;
  }
  if (state.head.kind === "detached") {
    ctx.printSegments(seg("* ", "success"), seg(`(HEAD detached at ${shortId(state.head.commit)})`, "success", true));
  }
  for (const name of Object.keys(state.branches).sort()) {
    const current = currentBranch(state) === name;
    ctx.printSegments(seg(current ? "* " : "  ", "success"), seg(name, current ? "success" : "default", current));
  }
  if (mode === "all") for (const ref of Object.keys(state.remoteRefs).sort()) ctx.print(`  remotes/${ref}`, "removed");
  const count = Object.keys(state.branches).length;
  ctx.narrate({
    icon: "🌳",
    title: count === 0 ? "No branches yet" : "Your branches",
    body:
      count === 0
        ? "Branches appear after your first commit — a branch is just a name pointing at a commit."
        : "A branch is only a lightweight, movable label pointing at one commit. The * marks the branch HEAD is on.",
  });
}

function deleteBranches(ctx: CommandContext, force: boolean) {
  const state = ctx.state;
  const names = ctx.args.positionals;
  if (names.length === 0) ctx.fail("fatal: branch name required", "Say which branch to delete: git branch -d <name>");
  const headId = headCommitId(state);

  for (const name of names) {
    const tip = own(state.branches, name);
    if (tip === undefined) ctx.fail(`error: branch '${name}' not found.`, "Run git branch to list existing branches.");
    if (currentBranch(state) === name) {
      ctx.fail(`error: Cannot delete branch '${name}' checked out`, "You can't saw off the branch you're sitting on. Switch to another branch first.");
    }
    if (!force && (!headId || !isAncestor(state, tip, headId))) {
      ctx.fail(
        `error: The branch '${name}' is not fully merged.\nIf you are sure you want to delete it, run 'git branch -D ${name}'.`,
        "Its commits aren't part of your current branch yet, so deleting the label could lose them. Merge it first, or use -D to force.",
      );
    }
    delete state.branches[name];
    ctx.print(`Deleted branch ${name} (was ${shortId(tip)}).`);
    ctx.emit({ type: "branch-deleted", name });
  }
  ctx.narrate({
    icon: "✂️",
    title: `Branch label${names.length > 1 ? "s" : ""} removed`,
    body: "Deleting a branch only removes the label. Commits still reachable from other branches stay put; unreachable ones fade away.",
  });
}

/** Copies the current branch (or a named one) to a new name, history and all — git branch -c. */
function copyBranch(ctx: CommandContext) {
  const state = ctx.state;
  const [first, second] = ctx.args.positionals;
  const from = second ? first : currentBranch(state);
  const to = second ?? first;
  if (!from || !to) ctx.fail("fatal: branch name required", "Usage: git branch -c <new-name>");
  const tip = own(state.branches, from);
  if (tip === undefined) ctx.fail(`error: refname refs/heads/${from} not found`, "Run git branch to see branch names.");
  assertNewBranchName(ctx, to);

  state.branches[to] = tip;
  ctx.emit({ type: "branch-created", name: to, at: tip });
  ctx.narrate({
    icon: "🌿",
    title: `Copied ${from} → ${to}`,
    body: `'${to}' starts at the same commit as '${from}', so it carries the same history. You're still on '${currentBranch(state)}'.`,
  });
}

function renameBranch(ctx: CommandContext, force = false) {
  const state = ctx.state;
  const [first, second] = ctx.args.positionals;
  const from = second ? first : currentBranch(state);
  const to = second ?? first;
  if (!from || !to) ctx.fail("fatal: branch name required", "Usage: git branch -m <old-name> <new-name>");
  const tip = own(state.branches, from);
  const unbornCurrent = tip === undefined && currentBranch(state) === from;
  if (tip === undefined && !unbornCurrent) ctx.fail(`error: refname refs/heads/${from} not found`, "Run git branch to see branch names.");
  // -M replaces an existing branch of that name; -m refuses.
  if (force && from !== to && own(state.branches, to) !== undefined) delete state.branches[to];
  assertNewBranchName(ctx, to);

  if (tip !== undefined) {
    const renamed: Record<string, string> = {};
    for (const [name, id] of Object.entries(state.branches)) renamed[name === from ? to : name] = id;
    state.branches = renamed;
  }
  if (currentBranch(state) === from) state.head = { kind: "branch", name: to };
  ctx.emit({ type: "branch-renamed", from, to });
  ctx.narrate({ icon: "🏷️", title: `Renamed ${from} → ${to}`, body: "Same commit, new label. Nothing in history changed." });
}

export const branchCommand = defineCommand({
  program: "git",
  name: "branch",
  category: "branching",
  summary: "List, create, rename or delete branches",
  usage: ["git branch", "git branch <name> [<start>]", "git branch -d <name>", "git branch -m <old> <new>"],
  description: "Creating a branch does NOT switch to it — use git switch for that.",
  examples: ["git branch feature", "git branch hotfix HEAD~1", "git branch -d feature"],
  options: {
    delete: { short: "d", long: "delete", description: "Delete a fully merged branch" },
    forceDelete: { short: "D", description: "Delete a branch even if it isn't merged" },
    move: { short: "m", long: "move", description: "Rename a branch" },
    forceMove: { short: "M", description: "Rename a branch, replacing one with that name" },
    copy: { short: "c", long: "copy", description: "Copy a branch under a new name" },
    list: { short: "l", long: "list", description: "List branches" },
    remotes: { short: "r", long: "remotes", description: "List remote-tracking branches" },
    all: { short: "a", long: "all", description: "List local and remote-tracking branches" },
  },
  run(ctx: CommandContext) {
    const state = ctx.state;
    if (flag(ctx.args, "delete") || flag(ctx.args, "forceDelete")) return deleteBranches(ctx, flag(ctx.args, "forceDelete"));
    if (flag(ctx.args, "move") || flag(ctx.args, "forceMove")) return renameBranch(ctx, flag(ctx.args, "forceMove"));
    if (flag(ctx.args, "copy")) return copyBranch(ctx);
    if (flag(ctx.args, "remotes")) return listBranches(ctx, "remote");
    if (flag(ctx.args, "all")) return listBranches(ctx, "all");
    if (flag(ctx.args, "list") || ctx.args.positionals.length === 0) return listBranches(ctx);

    const [name, start] = ctx.args.positionals;
    assertNewBranchName(ctx, name);
    if (!start && !headCommitId(state)) {
      ctx.fail(
        `fatal: Not a valid object name: '${currentBranch(state)}'.`,
        "A branch must point at a commit, and there are no commits yet. Make your first commit, then branch.",
      );
    }
    const at = resolveRevision(state, start ?? "HEAD");
    state.branches[name] = at;
    ctx.emit({ type: "branch-created", name, at });

    const onIt = currentBranch(state);
    ctx.narrate({
      icon: "🌱",
      title: `Branch '${name}' created`,
      body: `A new label now points at ${shortId(at)}. No files were copied — branches are cheap! HEAD is still on ${
        onIt ? `'${onIt}'` : "a detached commit"
      }; run git switch ${name} to start working on it.`,
    });
  },
});
