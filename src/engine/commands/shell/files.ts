import { computeStatus } from "../../core/tree";
import { own, splitLines } from "../../core/utils";
import { seg } from "../../runtime/output";
import { assertValidPath } from "../shared/paths";
import { type CommandContext, defineCommand } from "../types";

/** Writes a file into the working directory and emits the matching event. */
export function writeWorkdirFile(ctx: CommandContext, path: string, content: string): void {
  assertValidPath(path);
  const created = own(ctx.state.workdir, path) === undefined;
  ctx.state.workdir[path] = content;
  ctx.emit({ type: "file-written", path, created });
}

export const lsCommand = defineCommand({
  program: "shell",
  name: "ls",
  category: "files",
  summary: "List the files in your project folder",
  usage: ["ls"],
  run(ctx: CommandContext) {
    const state = ctx.state;
    const paths = Object.keys(state.workdir).sort();
    if (paths.length === 0) {
      ctx.print("(empty folder — create a file with: echo \"hello\" > hello.txt)", "muted");
      return;
    }
    const status = state.initialized ? computeStatus(state) : null;
    for (const path of paths) {
      const untracked = status?.untracked.includes(path);
      const modified = status?.unstaged.some((change) => change.path === path);
      const conflicted = status?.conflicts.includes(path);
      const ignored = status?.ignored.includes(path);
      const tag = conflicted ? "conflict" : ignored ? "ignored" : untracked ? "untracked" : modified ? "modified" : "";
      ctx.printSegments(
        seg(path, conflicted ? "error" : untracked ? "removed" : modified ? "warning" : "default"),
        seg(tag ? `  (${tag})` : "", "muted"),
      );
    }
  },
});

export const catCommand = defineCommand({
  program: "shell",
  name: "cat",
  category: "files",
  summary: "Print a file's contents",
  usage: ["cat <file>"],
  examples: ["cat README.md"],
  run(ctx: CommandContext) {
    const paths = ctx.args.positionals;
    if (paths.length === 0) ctx.fail("cat: missing file operand", "Usage: cat <file>");
    for (const path of paths) {
      const content = own(ctx.state.workdir, path);
      if (content === undefined) ctx.fail(`cat: ${path}: No such file or directory`, "Run ls to see which files exist.");
      for (const line of splitLines(content)) {
        const marker = /^(<<<<<<< |=======$|>>>>>>> )/.test(line);
        ctx.print(line, marker ? "error" : "default");
      }
    }
  },
});

export const touchCommand = defineCommand({
  program: "shell",
  name: "touch",
  category: "files",
  summary: "Create empty files",
  usage: ["touch <file>..."],
  examples: ["touch notes.txt"],
  run(ctx: CommandContext) {
    const paths = ctx.args.positionals;
    if (paths.length === 0) ctx.fail("touch: missing file operand", "Usage: touch <file>");
    const created = paths.filter((path) => own(ctx.state.workdir, path) === undefined);
    for (const path of created) writeWorkdirFile(ctx, path, "");
    if (created.length > 0) {
      ctx.narrate({
        icon: "📄",
        title: `Created ${created.join(", ")}`,
        body: "New files start life untracked — Git notices them but won't save them until you git add.",
      });
    }
  },
});

export const echoCommand = defineCommand({
  program: "shell",
  name: "echo",
  category: "files",
  summary: "Print text, or write it into a file with > (overwrite) or >> (append)",
  usage: ['echo "<text>"', 'echo "<text>" > <file>', 'echo "<text>" >> <file>'],
  description: "Use \\n inside quotes for a new line.",
  examples: ['echo "Hello" > hello.txt', 'echo "More" >> hello.txt'],
  run(ctx: CommandContext) {
    ctx.print(ctx.args.positionals.join(" ").replace(/\\n/g, "\n"));
  },
});

export const rmCommand = defineCommand({
  program: "shell",
  name: "rm",
  category: "files",
  summary: "Delete files from your folder",
  usage: ["rm <file>..."],
  examples: ["rm old.txt"],
  run(ctx: CommandContext) {
    const paths = ctx.args.positionals;
    if (paths.length === 0) ctx.fail("rm: missing operand", "Usage: rm <file>");
    for (const path of paths) {
      if (own(ctx.state.workdir, path) === undefined) ctx.fail(`rm: ${path}: No such file or directory`, "Run ls to see which files exist.");
    }
    for (const path of paths) {
      delete ctx.state.workdir[path];
      ctx.emit({ type: "file-removed", path });
    }
    ctx.narrate({
      icon: "🗑️",
      title: "File deleted from disk",
      body: ctx.state.initialized
        ? "Git notices the deletion but hasn't recorded it. Stage it with git add (or git rm) to include it in the next commit."
        : "The file is gone from your folder.",
    });
  },
});

export const editCommand = defineCommand({
  program: "shell",
  name: "edit",
  category: "files",
  summary: "Quickly change a file (simulator shortcut)",
  usage: ["edit <file>", 'edit <file> "<new line>"'],
  description: "Appends a line to the file, creating it if needed. Handy for making changes fast.",
  examples: ["edit app.js", 'edit README.md "## Installation"'],
  run(ctx: CommandContext) {
    const [path, ...words] = ctx.args.positionals;
    if (!path) ctx.fail("edit: missing file operand", "Usage: edit <file>");
    const existing = own(ctx.state.workdir, path);
    const lineCount = splitLines(existing).length;
    const line = words.length > 0 ? words.join(" ").replace(/\\n/g, "\n") : `change #${lineCount + 1}`;
    writeWorkdirFile(ctx, path, existing ? `${existing}\n${line}` : line);

    const tracked = own(ctx.state.index, path) !== undefined;
    ctx.print(`${existing === undefined ? "created" : "edited"} ${path}`, "muted");
    ctx.narrate({
      icon: "✏️",
      title: existing === undefined ? `Created ${path}` : `Edited ${path}`,
      body: !ctx.state.initialized
        ? "The file changed on disk. Git isn't watching yet — this folder isn't a repository."
        : tracked
          ? "The file on disk now differs from the staging area, so it shows up as modified. git add it to include the change in your next commit."
          : "Git sees a brand-new untracked file. git add it so Git starts tracking it.",
    });
  },
});
