import { ignorePatterns, isIgnored } from "../../core/ignore";
import { hasConflictMarkers } from "../../core/text";
import { own, pluralize } from "../../core/utils";
import { flag } from "../../parser/args";
import { expandPathspecs } from "../shared/paths";
import { type CommandContext, defineCommand } from "../types";

/** Copies the given paths from the working directory into the staging area. Returns staged paths. */
export function stagePaths(ctx: CommandContext, paths: readonly string[]): { staged: string[]; resolved: string[] } {
  const state = ctx.state;
  const staged: string[] = [];
  const resolved: string[] = [];

  for (const path of paths) {
    const disk = own(state.workdir, path);
    const index = own(state.index, path);
    if (disk === undefined && index !== undefined) {
      delete state.index[path];
      staged.push(path);
    } else if (disk !== undefined && disk !== index) {
      state.index[path] = disk;
      staged.push(path);
    }

    const merge = state.merge;
    if (merge?.conflicts.includes(path)) {
      merge.conflicts = merge.conflicts.filter((conflict) => conflict !== path);
      resolved.push(path);
      if (!staged.includes(path)) staged.push(path);
    }
  }
  return { staged, resolved };
}

export const addCommand = defineCommand({
  program: "git",
  name: "add",
  category: "snapshots",
  summary: "Stage changes so they go into the next commit",
  usage: ["git add <file>...", "git add .", "git add -A"],
  description: "Copies the current version of files into the staging area — the draft of your next snapshot.",
  examples: ["git add index.html", "git add .", "git add *.css"],
  options: {
    all: { short: "A", long: "all", description: "Stage every change, including deletions" },
    force: { short: "f", long: "force", description: "Stage files even if .gitignore ignores them" },
  },
  run(ctx: CommandContext) {
    const state = ctx.state;
    const specs = [...ctx.args.positionals, ...(ctx.args.paths ?? [])];
    if (flag(ctx.args, "all") && specs.length === 0) specs.push(".");
    if (specs.length === 0) {
      ctx.fail("Nothing specified, nothing added.", "Tell Git what to stage: git add <file>, or git add . for everything.");
    }

    const candidates = [...Object.keys(state.workdir), ...Object.keys(state.index), ...(state.merge?.conflicts ?? [])];
    const { matched, unmatched } = expandPathspecs(specs, candidates);
    if (unmatched.length > 0) {
      ctx.fail(
        `fatal: pathspec '${unmatched[0]}' did not match any files`,
        `There's no file called '${unmatched[0]}'. Run ls to see your files (names are case-sensitive).`,
      );
    }

    // Ignored, untracked files are skipped — unless named explicitly with --force.
    const patterns = ignorePatterns(state);
    const force = flag(ctx.args, "force");
    const ignored = matched.filter((path) => own(state.index, path) === undefined && isIgnored(state, path, patterns));
    const namedIgnored = ignored.filter((path) => specs.includes(path));
    if (namedIgnored.length > 0 && !force) {
      ctx.fail(
        `The following paths are ignored by one of your .gitignore files:\n${namedIgnored.join("\n")}\nhint: Use -f if you really want to add them.`,
        `${namedIgnored.join(", ")} matches a pattern in .gitignore, so Git leaves it alone on purpose.`,
      );
    }
    const toStage = force ? matched : matched.filter((path) => !ignored.includes(path));

    const { staged, resolved } = stagePaths(ctx, toStage);
    const stillMarked = resolved.filter((path) => hasConflictMarkers(state.workdir[path]));
    for (const path of stillMarked) {
      ctx.print(`warning: ${path} still contains conflict markers (<<<<<<<, =======, >>>>>>>)`, "warning");
    }

    if (staged.length === 0) {
      ctx.narrate({
        icon: "🤷",
        title: "Nothing new to stage",
        body: "Those files already match what's in the staging area, so there was nothing to copy.",
      });
      return;
    }

    ctx.emit({ type: "staged", paths: staged });
    if (resolved.length > 0) {
      ctx.narrate({
        icon: "🩹",
        title: `Conflict ${resolved.length === 1 ? "resolved" : "resolutions staged"}`,
        body: `Staging ${resolved.join(", ")} tells Git you've fixed the conflict.${
          state.merge && state.merge.conflicts.length === 0 ? " All conflicts are resolved — run git commit to finish the merge." : ""
        }`,
      });
      return;
    }
    ctx.narrate({
      icon: "📦",
      title: `${pluralize(staged.length, "change")} staged`,
      body: `${staged.join(", ")} ${staged.length === 1 ? "was" : "were"} copied into the staging area. They'll be part of the next commit — you can keep editing, but new edits need another git add.`,
    });
  },
});
