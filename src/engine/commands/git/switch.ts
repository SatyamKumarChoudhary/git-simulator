import { resolveRevision, shortId, tryResolveRevision } from "../../core/refs";
import { currentBranch, getCommit, headCommitId, recordReflog } from "../../core/repo";
import { own } from "../../core/utils";
import { flag, optionValue } from "../../parser/args";
import { requireNoMerge } from "../shared/guards";
import { checkoutFiles, detachHeadAt, narrateDetached, switchToBranch, trackRemoteBranch } from "../shared/worktree";
import { type CommandContext, defineCommand } from "../types";
import { assertNewBranchName } from "./branch";

/** Creates `name` at `start` (default HEAD) and switches to it. Shared by switch -c and checkout -b. */
export function createAndSwitch(ctx: CommandContext, name: string, start: string | undefined, verb: string): void {
  const state = ctx.state;
  assertNewBranchName(ctx, name);

  if (!start && !headCommitId(state)) {
    // Unborn branch: just rename where HEAD will put the first commit.
    const previous = currentBranch(state);
    state.head = { kind: "branch", name };
    ctx.print(`Switched to a new branch '${name}'`);
    ctx.emit({ type: "branch-created", name, at: null });
    ctx.narrate({
      icon: "🌱",
      title: `HEAD now points at '${name}'`,
      body: `There are no commits yet, so '${previous}' never really existed. Your first commit will start the '${name}' branch.`,
    });
    return;
  }

  const target = resolveRevision(state, start ?? "HEAD");
  const fromId = headCommitId(state);
  checkoutFiles(ctx, target, verb);
  state.branches[name] = target;
  state.head = { kind: "branch", name };
  recordReflog(state, target, `${verb}: moving to new branch ${name}`);
  ctx.print(`Switched to a new branch '${name}'`);
  ctx.emit({ type: "branch-created", name, at: target });
  ctx.emit({ type: "head-moved", from: fromId, to: target, branch: name });
  ctx.narrate({
    icon: "🌿",
    title: `Created '${name}' and switched to it`,
    body: `A new branch label appeared at ${shortId(target)} and HEAD hopped onto it. New commits will now move '${name}' forward while other branches stay where they are.`,
  });
}

export const switchCommand = defineCommand({
  program: "git",
  name: "switch",
  category: "branching",
  summary: "Move HEAD to another branch",
  usage: ["git switch <branch>", "git switch -c <new-branch> [<start>]", "git switch --detach <commit>"],
  description: "Updates your files to match the branch's latest commit and makes it the current branch.",
  examples: ["git switch feature", "git switch -c bugfix", "git switch --detach HEAD~2"],
  options: {
    create: { short: "c", long: "create", takesValue: true, valueName: "new-branch", description: "Create a new branch and switch to it" },
    detach: { long: "detach", description: "Point HEAD directly at a commit" },
  },
  run(ctx: CommandContext) {
    const state = ctx.state;
    requireNoMerge(ctx, "Switching branches");
    const created = optionValue(ctx.args, "create");
    const [target] = ctx.args.positionals;

    if (created) return createAndSwitch(ctx, created, target, "switch");

    if (!target) ctx.fail("fatal: missing branch or commit argument", "Tell Git where to go: git switch <branch>");

    if (flag(ctx.args, "detach")) {
      const id = resolveRevision(state, target);
      detachHeadAt(ctx, id, "switch", target);
      ctx.print(`HEAD is now at ${shortId(id)} ${getCommit(state, id).message}`);
      narrateDetached(ctx, id);
      return;
    }

    if (own(state.branches, target) === undefined) {
      if (trackRemoteBranch(ctx, target, "switch")) return;
      if (tryResolveRevision(state, target)) {
        ctx.fail(
          `fatal: a branch is expected, got commit '${target}'`,
          `git switch only goes to branches. To visit a commit directly use git switch --detach ${target} (or git checkout ${target}).`,
        );
      }
      ctx.fail(`fatal: invalid reference: ${target}`, `There's no branch called '${target}'. Create it with git switch -c ${target}`);
    }
    if (currentBranch(state) === target) {
      ctx.print(`Already on '${target}'`);
      ctx.narrate({ icon: "📍", title: `Already on '${target}'`, body: "HEAD was already pointing at this branch, so nothing moved." });
      return;
    }

    switchToBranch(ctx, target, "switch");
    ctx.print(`Switched to branch '${target}'`);
    ctx.narrate({
      icon: "🚂",
      title: `HEAD → ${target}`,
      body: `HEAD now points at '${target}', and your working directory was updated to match its latest commit ${shortId(state.branches[target])}. New commits will extend '${target}'.`,
    });
  },
});
