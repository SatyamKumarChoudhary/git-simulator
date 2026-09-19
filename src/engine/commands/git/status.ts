import { shortId } from "../../core/refs";
import { headCommitId, isUnborn } from "../../core/repo";
import { own } from "../../core/utils";
import { trackingCounts } from "../shared/remote";
import { type ChangeKind, computeStatus, isClean } from "../../core/tree";
import { pluralize } from "../../core/utils";
import { flag } from "../../parser/args";
import { seg } from "../../runtime/output";
import { type CommandContext, defineCommand } from "../types";

const LABEL: Record<ChangeKind, string> = { added: "new file:", modified: "modified:", deleted: "deleted:" };
const SHORT: Record<ChangeKind, string> = { added: "A", modified: "M", deleted: "D" };

function printShort(ctx: CommandContext) {
  const status = computeStatus(ctx.state);
  const rows = new Map<string, { x: string; y: string }>();
  const row = (path: string) => rows.get(path) ?? rows.set(path, { x: " ", y: " " }).get(path)!;

  for (const change of status.staged) row(change.path).x = SHORT[change.kind];
  for (const change of status.unstaged) row(change.path).y = SHORT[change.kind];
  for (const path of status.conflicts) Object.assign(row(path), { x: "U", y: "U" });
  for (const path of status.untracked) Object.assign(row(path), { x: "?", y: "?" });

  for (const [path, { x, y }] of [...rows.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const untracked = x === "?";
    ctx.printSegments(seg(x, untracked ? "removed" : "added"), seg(y, "removed"), seg(` ${path}`));
  }
}

export const statusCommand = defineCommand({
  program: "git",
  name: "status",
  category: "inspect",
  summary: "Show which files are changed, staged or untracked",
  usage: ["git status", "git status -s"],
  description: "Your best friend. Run it whenever you're unsure what state things are in.",
  options: {
    short: { short: "s", long: "short", description: "Give the output in the short format" },
  },
  run(ctx: CommandContext) {
    if (flag(ctx.args, "short")) {
      printShort(ctx);
      return;
    }

    const state = ctx.state;
    const status = computeStatus(state);

    if (state.head.kind === "branch") ctx.printSegments(seg("On branch "), seg(state.head.name, "branch", true));
    else ctx.printSegments(seg("HEAD detached at ", "removed"), seg(shortId(state.head.commit), "hash", true));

    const upstream = state.head.kind === "branch" ? own(state.upstreams, state.head.name) : undefined;
    const upstreamTip = upstream ? own(state.remoteRefs, upstream) : undefined;
    const localTip = headCommitId(state);
    if (upstream && upstreamTip && localTip) {
      const { ahead, behind } = trackingCounts(state, localTip, upstreamTip);
      const commits = (n: number) => `${n} commit${n === 1 ? "" : "s"}`;
      if (ahead === 0 && behind === 0) ctx.print(`Your branch is up to date with '${upstream}'.`);
      else if (behind === 0) {
        ctx.print(`Your branch is ahead of '${upstream}' by ${commits(ahead)}.`);
        ctx.print('  (use "git push" to publish your local commits)', "muted");
      } else if (ahead === 0) {
        ctx.print(`Your branch is behind '${upstream}' by ${commits(behind)}, and can be fast-forwarded.`);
        ctx.print('  (use "git pull" to update your local branch)', "muted");
      } else {
        ctx.print(`Your branch and '${upstream}' have diverged,\nand have ${ahead} and ${behind} different commits each, respectively.`);
        ctx.print('  (use "git pull" to merge the remote branch into yours)', "muted");
      }
    }

    if (isUnborn(state)) ctx.print("\nNo commits yet");

    if (state.merge) {
      ctx.print("");
      if (status.conflicts.length > 0) {
        ctx.print("You have unmerged paths.");
        ctx.print('  (fix conflicts and run "git commit")', "muted");
      } else {
        ctx.print("All conflicts fixed but you are still merging.");
        ctx.print('  (use "git commit" to conclude merge)', "muted");
      }
      ctx.print('  (use "git merge --abort" to abort the merge)', "muted");
    }

    if (status.staged.length > 0) {
      ctx.print("\nChanges to be committed:");
      ctx.print('  (use "git restore --staged <file>..." to unstage)', "muted");
      for (const change of status.staged) ctx.print(`\t${LABEL[change.kind].padEnd(12)}${change.path}`, "added");
    }
    if (status.conflicts.length > 0) {
      ctx.print("\nUnmerged paths:");
      ctx.print('  (use "git add <file>..." to mark resolution)', "muted");
      for (const path of status.conflicts) ctx.print(`\tboth modified:   ${path}`, "removed");
    }
    if (status.unstaged.length > 0) {
      ctx.print("\nChanges not staged for commit:");
      ctx.print('  (use "git add <file>..." to update what will be committed)', "muted");
      ctx.print('  (use "git restore <file>..." to discard changes in working directory)', "muted");
      for (const change of status.unstaged) ctx.print(`\t${LABEL[change.kind].padEnd(12)}${change.path}`, "removed");
    }
    if (status.untracked.length > 0) {
      ctx.print("\nUntracked files:");
      ctx.print('  (use "git add <file>..." to include in what will be committed)', "muted");
      for (const path of status.untracked) ctx.print(`\t${path}`, "removed");
    }

    if (isClean(status) && !state.merge) {
      ctx.print(isUnborn(state) ? "\nnothing to commit (create/copy files and use \"git add\" to track)" : "\nnothing to commit, working tree clean", "success");
    } else if (status.staged.length === 0 && !state.merge) {
      ctx.print('\nno changes added to commit (use "git add" and/or "git commit -a")');
    }

    const parts = [
      status.staged.length && pluralize(status.staged.length, "staged change"),
      status.unstaged.length && pluralize(status.unstaged.length, "unstaged change"),
      status.untracked.length && pluralize(status.untracked.length, "untracked file"),
      status.conflicts.length && pluralize(status.conflicts.length, "conflict"),
    ].filter(Boolean);

    ctx.narrate({
      icon: "🔍",
      title: "Status check",
      body:
        parts.length === 0
          ? "Everything on disk matches the last commit. A perfectly clean working tree ✨"
          : `Git sees ${parts.join(", ")}. Staged changes go into the next commit; everything else stays behind until you git add it.`,
    });
  },
});
