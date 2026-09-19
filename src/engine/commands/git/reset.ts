import { ancestors, reachableCommits } from "../../core/graph";
import { resolveRevision, shortId, tryResolveRevision } from "../../core/refs";
import { getCommit, headTree, moveHead } from "../../core/repo";
import { computeStatus } from "../../core/tree";
import { own, sortedUnion } from "../../core/utils";
import { flag } from "../../parser/args";
import { requireHeadCommit } from "../shared/guards";
import { expandPathspecs } from "../shared/paths";
import { type CommandContext, defineCommand } from "../types";
import { unstagePaths } from "./restore";

type Mode = "soft" | "mixed" | "hard";

const EXPLAIN: Record<Mode, string> = {
  soft: "Only the branch label moved. The staging area and your files still hold the newer changes — ready to be re-committed.",
  mixed: "The branch label moved and the staging area was reset to match. Your files on disk keep their changes (now unstaged).",
  hard: "The branch label, staging area AND your files all jumped back. Uncommitted work is gone.",
};

function resetPaths(ctx: CommandContext, specs: readonly string[]) {
  const state = ctx.state;
  const committed = headTree(state);
  const { matched, unmatched } = expandPathspecs(specs, [...Object.keys(state.index), ...Object.keys(committed)]);
  if (unmatched.length > 0) {
    ctx.fail(
      `fatal: ambiguous argument '${unmatched[0]}': unknown revision or path not in the working tree.`,
      `'${unmatched[0]}' is neither a commit nor a tracked file.`,
    );
  }
  const unstaged = unstagePaths(ctx, matched, committed);
  if (unstaged.length > 0) {
    ctx.print("Unstaged changes after reset:");
    for (const path of unstaged) ctx.print(`M\t${path}`, "removed");
    ctx.emit({ type: "unstaged", paths: unstaged });
  }
  ctx.narrate({
    icon: "↩️",
    title: "Unstaged",
    body: "git reset <file> takes files out of the staging area — the same as git restore --staged <file>.",
  });
}

export const resetCommand = defineCommand({
  program: "git",
  name: "reset",
  category: "undo",
  summary: "Move the current branch back to an earlier commit",
  usage: ["git reset [--soft | --mixed | --hard] <commit>", "git reset <file>"],
  description: "Rewinds history for the current branch. --soft keeps everything staged, --mixed (default) unstages, --hard throws changes away.",
  examples: ["git reset --soft HEAD~1", "git reset HEAD~2", "git reset --hard HEAD~1", "git reset notes.txt"],
  options: {
    soft: { long: "soft", description: "Move the branch only" },
    mixed: { long: "mixed", description: "Move the branch and reset the staging area (default)" },
    hard: { long: "hard", description: "Move the branch and reset staging area + files" },
  },
  run(ctx: CommandContext) {
    const state = ctx.state;
    const [first, ...rest] = ctx.args.positionals;
    const modeFlags = (["soft", "mixed", "hard"] as const).filter((mode) => flag(ctx.args, mode));
    if (modeFlags.length > 1) ctx.fail("fatal: choose only one of --soft, --mixed or --hard", "Pick one reset mode.");

    const firstIsCommit = first !== undefined && tryResolveRevision(state, first) !== null;
    if ((first !== undefined && !firstIsCommit) || rest.length > 0 || (ctx.args.paths?.length ?? 0) > 0) {
      if (modeFlags.length > 0) ctx.fail(`fatal: Cannot do --${modeFlags[0]} reset with paths.`, "Reset modes apply to commits, not individual files.");
      const specs = [...(firstIsCommit ? [] : first ? [first] : []), ...rest, ...(ctx.args.paths ?? [])];
      return resetPaths(ctx, specs);
    }

    const mode: Mode = modeFlags[0] ?? "mixed";
    const from = requireHeadCommit(ctx);
    if (mode === "soft" && state.merge) ctx.fail("fatal: Cannot do a soft reset in the middle of a merge.", "Use git merge --abort instead.");

    const to = resolveRevision(state, first ?? "HEAD");
    const target = getCommit(state, to).tree;
    const before = headTree(state);

    if (mode !== "soft") {
      if (mode === "hard") {
        for (const path of sortedUnion(Object.keys(state.index), Object.keys(before), Object.keys(target), state.merge?.conflicts ?? [])) {
          const content = own(target, path);
          if (content === undefined) delete state.workdir[path];
          else state.workdir[path] = content;
        }
      }
      state.index = { ...target };
      state.merge = null;
    }
    moveHead(state, to, `reset: moving to ${first ?? "HEAD"}`);

    // Only commits that no branch, tag or HEAD can reach any more are truly "lost".
    const reachable = reachableCommits(state);
    const orphaned = from === to ? 0 : [...ancestors(state, from)].filter((id) => !reachable.has(id)).length;
    if (mode === "hard") ctx.print(`HEAD is now at ${shortId(to)} ${getCommit(state, to).message}`);
    if (mode === "mixed") {
      const status = computeStatus(state);
      if (status.unstaged.length > 0) {
        ctx.print("Unstaged changes after reset:");
        for (const change of status.unstaged) ctx.print(`${change.kind === "deleted" ? "D" : "M"}\t${change.path}`, "removed");
      }
    }

    ctx.emit({ type: "reset", mode, from, to });
    ctx.narrate({
      icon: mode === "hard" ? "⏪" : "↩️",
      title: `git reset --${mode}${from === to ? "" : ` to ${shortId(to)}`}`,
      body: `${EXPLAIN[mode]}${
        orphaned > 0
          ? ` ${orphaned} commit${orphaned === 1 ? " is" : "s are"} no longer on any branch (shown faded) — git reflog can still find ${orphaned === 1 ? "it" : "them"}.`
          : ""
      }`,
    });
  },
});
