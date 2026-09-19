import { own } from "../../core/utils";
import { assertValidPath } from "../shared/paths";
import { type CommandContext, defineCommand } from "../types";

export const gitMvCommand = defineCommand({
  program: "git",
  name: "mv",
  category: "snapshots",
  summary: "Rename or move a tracked file",
  usage: ["git mv <old-name> <new-name>"],
  description: "Renames the file on disk and stages the rename in one step, so the next commit records it.",
  examples: ["git mv saturn1.py saturn11.py", "git mv notes.txt docs.txt"],
  run(ctx: CommandContext) {
    const state = ctx.state;
    const [from, to] = [...ctx.args.positionals, ...(ctx.args.paths ?? [])];
    if (!from || !to) ctx.fail("usage: git mv <source> <destination>", "Name the file and what to call it: git mv old.txt new.txt");

    assertValidPath(to);
    const staged = own(state.index, from);
    if (staged === undefined) {
      ctx.fail(
        `fatal: not under version control, source=${from}, destination=${to}`,
        `Git only moves files it tracks. Stage ${from} first with git add ${from}.`,
      );
    }
    if (own(state.index, to) !== undefined || own(state.workdir, to) !== undefined) {
      ctx.fail(`fatal: destination exists, source=${from}, destination=${to}`, `There's already a ${to}. Pick another name.`);
    }

    const onDisk = own(state.workdir, from);
    delete state.index[from];
    state.index[to] = staged;
    if (onDisk !== undefined) {
      delete state.workdir[from];
      state.workdir[to] = onDisk;
    }

    ctx.emit({ type: "file-removed", path: from });
    ctx.emit({ type: "file-written", path: to, created: true });
    ctx.print(`Renaming ${from} => ${to}`);
    ctx.narrate({
      icon: "🏷️",
      title: `${from} → ${to}`,
      body: "git mv does two things at once: it renames the file on disk and stages the rename, so your next commit records it as a rename.",
    });
  },
});
