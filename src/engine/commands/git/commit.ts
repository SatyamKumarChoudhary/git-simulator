import { shortId } from "../../core/refs";
import { createCommit, getCommit, headCommitId, headTree, moveHead } from "../../core/repo";
import { computeStatus, treesEqual } from "../../core/tree";
import { flag, optionValue } from "../../parser/args";
import { conflictAdvice } from "../shared/conflicts";
import { printCommitSummary } from "../shared/format";
import { type CommandContext, defineCommand } from "../types";
import { stagePaths } from "./add";

export const commitCommand = defineCommand({
  program: "git",
  name: "commit",
  category: "snapshots",
  summary: "Save the staging area as a new snapshot in history",
  usage: ['git commit -m "<message>"', 'git commit -am "<message>"', 'git commit --amend -m "<message>"'],
  description: "A commit is a permanent snapshot of the staging area, linked to its parent commit.",
  examples: ['git commit -m "Add homepage"', 'git commit -am "Fix typo"', "git commit --amend"],
  options: {
    message: { short: "m", long: "message", takesValue: true, valueName: "message", description: "The commit message" },
    all: { short: "a", long: "all", description: "Stage changes to tracked files first" },
    amend: { long: "amend", description: "Replace the last commit instead of adding a new one" },
    allowEmpty: { long: "allow-empty", description: "Allow a commit with no changes" },
    noEdit: { long: "no-edit", description: "Keep the existing message (with --amend)" },
  },
  run(ctx: CommandContext) {
    const state = ctx.state;
    const amend = flag(ctx.args, "amend");
    const merge = state.merge;
    let message = optionValue(ctx.args, "message")?.trim();

    if (merge && merge.conflicts.length > 0) {
      ctx.fail(
        "error: Committing is not possible because you have unmerged files.",
        `Resolve ${merge.conflicts[0]} first — ${conflictAdvice(merge.conflicts[0])} — then git add it to mark it resolved.`,
      );
    }
    if (amend && merge) ctx.fail("fatal: You are in the middle of a merge -- cannot amend.", "Finish the merge with git commit first.");

    const headId = headCommitId(state);
    const previous = amend && headId ? getCommit(state, headId) : null;
    if (amend && !previous) ctx.fail("fatal: You have nothing to amend.", "There are no commits yet — make a normal commit first.");
    if (!message && previous) message = previous.message;
    if (!message && merge) message = `Merge branch '${merge.label}'`;
    if (!message) {
      ctx.fail(
        "Aborting commit due to empty commit message.",
        'Real Git would open a text editor here. In the simulator, add a message with -m: git commit -m "Describe your change"',
      );
    }

    if (flag(ctx.args, "all")) {
      const { staged } = stagePaths(ctx, Object.keys(state.index));
      if (staged.length > 0) {
        ctx.emit({ type: "staged", paths: staged });
        ctx.checkpoint();
      }
    }

    const before = headTree(state);
    const tree = { ...state.index };

    if (!amend && !merge && treesEqual(tree, before) && !flag(ctx.args, "allowEmpty")) {
      const status = computeStatus(state);
      if (status.unstaged.length > 0 || status.untracked.length > 0) {
        ctx.fail(
          'no changes added to commit (use "git add" and/or "git commit -a")',
          "The staging area is empty, so there's nothing to snapshot. Stage your changes first with git add <file>.",
        );
      }
      ctx.fail("nothing to commit, working tree clean", "There's nothing new to save — every change is already committed. Check with git status.");
    }

    if (previous) {
      const commit = createCommit(state, { message, parents: previous.parents, tree, copiedFrom: previous.id });
      moveHead(state, commit.id, `commit (amend): ${message}`);
      printCommitSummary(ctx, commit, previous.parents[0] ? getCommit(state, previous.parents[0]).tree : {});
      ctx.emit({ type: "commit", id: commit.id, kind: "amend" });
      ctx.narrate({
        icon: "🪄",
        title: "Last commit replaced",
        body: `--amend doesn't edit ${shortId(previous.id)} — commits can never change. Git made a brand-new commit ${shortId(commit.id)} with the same parent and moved the branch to it. The old one is now orphaned (faded).`,
      });
      return;
    }

    const parents = headId ? [headId] : [];
    if (merge) parents.push(merge.theirs);
    const commit = createCommit(state, { message, parents, tree });
    moveHead(state, commit.id, `${merge ? "commit (merge)" : headId ? "commit" : "commit (initial)"}: ${message}`);
    state.merge = null;

    printCommitSummary(ctx, commit, before, headId ? "" : "(root-commit)");
    ctx.emit({ type: "commit", id: commit.id, kind: merge ? "merge" : headId ? "normal" : "root" });

    const where = state.head.kind === "branch" ? `'${state.head.name}'` : "detached HEAD";
    ctx.narrate(
      merge
        ? {
            icon: "🤝",
            title: "Merge complete",
            body: `Commit ${shortId(commit.id)} has two parents, tying both lines of history together. The conflict is officially history.`,
          }
        : !headId
          ? {
              icon: "📸",
              title: "Your very first snapshot!",
              body: `Commit ${shortId(commit.id)} is the root of your history. ${where} now points to it, and HEAD follows along.`,
            }
          : {
              icon: "📸",
              title: `Snapshot ${shortId(commit.id)} saved`,
              body: `Git turned the staging area into a new commit whose parent is ${shortId(headId)}. The branch ${where} moved forward to it, carrying HEAD along.`,
            },
    );
  },
});
