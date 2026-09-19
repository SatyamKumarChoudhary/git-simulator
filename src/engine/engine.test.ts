import { describe, expect, it } from "vitest";
import { type RepoState, GitEngine, computeStatus, headCommitId, isAncestor, resolveRevision } from "./index";
import { parseCommandLine } from "./parser/command-line";
import { plainText } from "./runtime/output";
import { mergeContents } from "./core/text";

const engine = new GitEngine();

function run(state: RepoState, input: string) {
  const result = engine.execute(input, state);
  const text = result.frames.flatMap((frame) => frame.output.map(plainText)).join("\n");
  return { ...result, text };
}

function ok(state: RepoState, input: string): RepoState {
  const result = run(state, input);
  if (!result.ok) throw new Error(`"${input}" failed:\n${result.text}`);
  return result.state;
}

const starter = () =>
  engine.build(['echo "hello" > README.md', "git init", "git add .", 'git commit -m "Initial commit"']);

describe("command line parser", () => {
  it("handles quotes, chains and redirects", () => {
    const segments = parseCommandLine(`git add . && git commit -m "Add \\"quotes\\"" ; echo 'hi there' >> notes.txt`);
    expect(segments.map((s) => s.argv)).toEqual([
      ["git", "add", "."],
      ["git", "commit", "-m", 'Add "quotes"'],
      ["echo", "hi there"],
    ]);
    expect(segments[1].connector).toBe("&&");
    expect(segments[2].redirect).toEqual({ mode: "append", path: "notes.txt" });
    expect(segments[1].raw).toBe(`git commit -m "Add \\"quotes\\""`);
  });

  it("reports unclosed quotes", () => {
    const result = run(starter(), 'git commit -m "oops');
    expect(result.ok).toBe(false);
    expect(result.text).toContain("unclosed double quote");
  });
});

describe("snapshots", () => {
  it("tracks the working directory → staging area → commit flow", () => {
    let state = engine.build(['echo "a" > a.txt', 'echo "b" > b.txt', "git init"]);
    expect(computeStatus(state).untracked).toEqual(["a.txt", "b.txt"]);

    state = ok(state, "git add a.txt");
    expect(computeStatus(state).staged).toEqual([{ path: "a.txt", kind: "added" }]);

    const commit = run(state, 'git commit -m "Add a"');
    expect(commit.text).toContain("(root-commit)");
    state = commit.state;
    expect(computeStatus(state).untracked).toEqual(["b.txt"]);
    expect(state.branches.main).toBe(headCommitId(state));
  });

  it("refuses to commit without staged changes and explains why", () => {
    const state = ok(starter(), "edit README.md");
    const result = run(state, 'git commit -m "nothing staged"');
    expect(result.ok).toBe(false);
    expect(result.text).toContain("no changes added to commit");
    expect(result.state).toBe(state);
  });

  it("commit -am stages tracked files in an extra animation frame", () => {
    const state = ok(starter(), "edit README.md");
    const result = run(state, 'git commit -am "Update readme"');
    expect(result.ok).toBe(true);
    expect(result.frames).toHaveLength(2);
    expect(result.frames[0].events[0]).toMatchObject({ type: "staged" });
  });

  it("amend replaces the last commit", () => {
    let state = starter();
    const before = headCommitId(state)!;
    state = ok(state, 'git commit --amend -m "Better message"');
    const after = headCommitId(state)!;
    expect(after).not.toBe(before);
    expect(state.commits[after].message).toBe("Better message");
    expect(state.commits[after].copiedFrom).toBe(before);
  });

  it("redirects output into files", () => {
    let state = ok(starter(), 'echo "line one" > notes.txt');
    state = ok(state, 'echo "line two" >> notes.txt');
    expect(state.workdir["notes.txt"]).toBe("line one\nline two");
  });
});

describe("commands from the notes", () => {
  it("renames a tracked file with git mv", () => {
    const state = ok(starter(), "git mv README.md docs.md");
    expect(state.index["docs.md"]).toBe("hello");
    expect(state.workdir["docs.md"]).toBe("hello");
    expect(state.index["README.md"]).toBeUndefined();
    expect(run(state, "git mv nope.txt other.txt").ok).toBe(false);
  });

  it("copies a branch with -c and force-renames with -M", () => {
    let state = ok(starter(), "git branch -c backup");
    expect(state.branches.backup).toBe(state.branches.main);
    state = ok(state, "git branch -M main trunk");
    expect(state.branches.trunk).toBeDefined();
    expect(state.branches.main).toBeUndefined();
  });

  it("accepts a commit range in git diff", () => {
    const state = ok(starter(), 'echo "hi again" > README.md && git commit -am "Second"');
    expect(run(state, "git diff HEAD~1..HEAD").text).toContain("README.md");
  });

  it("answers git --version", () => {
    expect(run(starter(), "git --version").text).toContain("git version");
  });
});

describe("branching", () => {
  it("creates, switches and protects uncommitted work", () => {
    let state = ok(starter(), "git switch -c feature");
    expect(state.head).toEqual({ kind: "branch", name: "feature" });
    state = ok(state, 'echo "feature" > feature.txt && git add . && git commit -m "Feature"');
    state = ok(state, "git switch main");
    expect(state.workdir["feature.txt"]).toBeUndefined();

    state = ok(state, 'echo "changed" > README.md');
    state = ok(state, "git add README.md");
    // README.md is identical on both branches, so the change travels along.
    state = ok(state, "git switch feature");
    expect(state.workdir["README.md"]).toBe("changed");
  });

  it("blocks switching when local changes would be overwritten", () => {
    let state = ok(starter(), "git switch -c feature");
    state = ok(state, 'echo "v2" > README.md && git commit -am "v2"');
    state = ok(state, "git switch main");
    state = ok(state, 'echo "local" > README.md');
    const result = run(state, "git switch feature");
    expect(result.ok).toBe(false);
    expect(result.text).toContain("would be overwritten");
  });

  it("detaches HEAD when checking out a commit", () => {
    let state = ok(starter(), 'edit README.md && git commit -am "Two"');
    state = ok(state, "git checkout HEAD~1");
    expect(state.head.kind).toBe("detached");
    expect(state.workdir["README.md"]).toBe("hello");
  });

  it("resolves revision syntax", () => {
    let state = ok(starter(), 'edit README.md && git commit -am "Two" && edit README.md && git commit -am "Three"');
    const three = headCommitId(state)!;
    const one = resolveRevision(state, "HEAD~2");
    expect(state.commits[one].message).toBe("Initial commit");
    expect(resolveRevision(state, three.slice(0, 5))).toBe(three);
    state = ok(state, "git tag v1 HEAD^");
    expect(state.commits[resolveRevision(state, "v1")].message).toBe("Two");
  });
});

describe("merging", () => {
  it("fast-forwards when possible", () => {
    let state = ok(starter(), 'git switch -c feature && edit a.txt && git add . && git commit -m "A"');
    const tip = headCommitId(state);
    state = ok(state, "git switch main");
    const result = run(state, "git merge feature");
    expect(result.text).toContain("Fast-forward");
    expect(result.state.branches.main).toBe(tip);
  });

  it("creates a merge commit for diverged branches and merges different lines cleanly", () => {
    let state = engine.build([
      'echo "one\\ntwo\\nthree" > list.txt',
      "git init",
      "git add .",
      'git commit -m "List"',
      "git switch -c feature",
      'echo "ONE\\ntwo\\nthree" > list.txt',
      'git commit -am "Shout one"',
      "git switch main",
      'echo "one\\ntwo\\nTHREE" > list.txt',
      'git commit -am "Shout three"',
    ]);
    state = ok(state, "git merge feature");
    const head = state.commits[headCommitId(state)!];
    expect(head.parents).toHaveLength(2);
    expect(state.workdir["list.txt"]).toBe("ONE\ntwo\nTHREE");
  });

  it("stops on conflicts and finishes after resolution", () => {
    let state = engine.build([
      'echo "Hello" > greeting.txt',
      "git init",
      "git add .",
      'git commit -m "Greeting"',
      "git switch -c feature",
      'echo "Hola" > greeting.txt',
      'git commit -am "Spanish"',
      "git switch main",
      'echo "Bonjour" > greeting.txt',
      'git commit -am "French"',
    ]);
    const conflict = run(state, "git merge feature");
    expect(conflict.ok).toBe(true);
    expect(conflict.text).toContain("CONFLICT");
    state = conflict.state;
    expect(state.merge?.conflicts).toEqual(["greeting.txt"]);
    expect(state.workdir["greeting.txt"]).toBe("<<<<<<< HEAD\nBonjour\n=======\nHola\n>>>>>>> feature");

    expect(run(state, 'git commit -m "too early"').ok).toBe(false);
    state = ok(state, 'echo "Hello in every language" > greeting.txt && git add greeting.txt && git commit -m "Merge"');
    const head = state.commits[headCommitId(state)!];
    expect(head.parents).toHaveLength(2);
    expect(state.merge).toBeNull();
    expect(computeStatus(state).conflicts).toEqual([]);
  });

  it("resolves a conflict by picking a side with checkout/restore --ours and --theirs", () => {
    const conflicted = engine.build([
      'echo "Hello" > greeting.txt',
      "git init",
      "git add .",
      'git commit -m "Greeting"',
      "git switch -c feature",
      'echo "Hola" > greeting.txt',
      'git commit -am "Spanish"',
      "git switch main",
      'echo "Bonjour" > greeting.txt',
      'git commit -am "French"',
      "git merge feature",
    ]);
    expect(ok(conflicted, "git checkout --theirs greeting.txt").workdir["greeting.txt"]).toBe("Hola");
    expect(ok(conflicted, "git restore --ours greeting.txt").workdir["greeting.txt"]).toBe("Bonjour");

    const merged = ok(conflicted, 'git checkout --theirs greeting.txt && git add greeting.txt && git commit -m "Merge"');
    expect(merged.merge).toBeNull();
    expect(merged.commits[headCommitId(merged)!].tree["greeting.txt"]).toBe("Hola");

    expect(run(conflicted, "git checkout --theirs nope.txt").ok).toBe(false);
    expect(run(starter(), "git checkout --ours README.md").ok).toBe(false);
  });

  it("merge --abort restores the pre-merge state", () => {
    const state = engine.build([
      'echo "x" > f.txt', "git init", "git add .", 'git commit -m "x"',
      "git switch -c b", 'echo "y" > f.txt', 'git commit -am "y"',
      "git switch main", 'echo "z" > f.txt', 'git commit -am "z"',
      "git merge b",
    ]);
    const aborted = ok(state, "git merge --abort");
    expect(aborted.merge).toBeNull();
    expect(aborted.workdir["f.txt"]).toBe("z");
  });

  it("diff3 merges non-overlapping edits", () => {
    const merged = mergeContents("a\nb\nc\nd", "a\nB\nc\nd", "a\nb\nc\nD", { ours: "HEAD", theirs: "x" });
    expect(merged).toEqual({ content: "a\nB\nc\nD", conflicted: false });
  });
});

describe("undo", () => {
  it("reset modes move the right things", () => {
    const base = ok(starter(), 'edit README.md && git commit -am "Two"');
    const soft = ok(base, "git reset --soft HEAD~1");
    expect(computeStatus(soft).staged).toHaveLength(1);
    const mixed = ok(base, "git reset HEAD~1");
    expect(computeStatus(mixed).unstaged).toHaveLength(1);
    const hard = ok(base, "git reset --hard HEAD~1");
    expect(computeStatus(hard).unstaged).toHaveLength(0);
    expect(hard.workdir["README.md"]).toBe("hello");
  });

  it("restore --staged unstages without losing edits", () => {
    let state = ok(starter(), 'echo "secret" > secret.txt && git add .');
    state = ok(state, "git restore --staged secret.txt");
    expect(computeStatus(state).untracked).toEqual(["secret.txt"]);
    expect(state.workdir["secret.txt"]).toBe("secret");
  });

  it("revert adds an inverse commit", () => {
    let state = ok(starter(), 'echo "bug" > bug.js && git add . && git commit -m "Add bug" && edit README.md && git commit -am "More"');
    state = ok(state, "git revert HEAD~1");
    expect(state.workdir["bug.js"]).toBeUndefined();
    expect(state.commits[headCommitId(state)!].message).toBe('Revert "Add bug"');
  });

  it("only counts commits no ref can reach as orphaned after a reset", () => {
    let state = ok(starter(), 'git switch -c feature && edit a.txt "a" && git add . && git commit -m "A" && git switch main && edit b.txt "b" && git add . && git commit -m "B" && git merge feature');
    const result = run(state, "git reset --hard HEAD~1");
    state = result.state;
    const narration = result.frames[result.frames.length - 1].narration;
    expect(narration?.body).toContain("1 commit is no longer on any branch");
  });

  it("reflog references work", () => {
    let state = ok(starter(), 'edit README.md && git commit -am "Two"');
    const two = headCommitId(state);
    state = ok(state, "git reset --hard HEAD~1");
    state = ok(state, "git reset --hard HEAD@{1}");
    expect(headCommitId(state)).toBe(two);
  });
});

describe("rewriting history", () => {
  it("cherry-picks a single commit", () => {
    let state = ok(starter(), 'git switch -c exp && echo "1" > one.txt && git add . && git commit -m "One" && echo "2" > two.txt && git add . && git commit -m "Two"');
    state = ok(state, "git switch main && git cherry-pick exp");
    expect(state.workdir["two.txt"]).toBe("2");
    expect(state.workdir["one.txt"]).toBeUndefined();
  });

  it("rebases onto another branch with a frame per replayed commit", () => {
    let state = ok(starter(), 'git switch -c feature && echo "f1" > f1.txt && git add . && git commit -m "F1" && echo "f2" > f2.txt && git add . && git commit -m "F2"');
    state = ok(state, 'git switch main && echo "m" > m.txt && git add . && git commit -m "M"');
    state = ok(state, "git switch feature");
    const result = run(state, "git rebase main");
    expect(result.ok).toBe(true);
    expect(result.frames.length).toBe(4);
    state = result.state;
    expect(isAncestor(state, state.branches.main, state.branches.feature)).toBe(true);
    expect(state.head).toEqual({ kind: "branch", name: "feature" });
    expect(state.workdir["m.txt"]).toBe("m");
  });
});

describe("custom commands and errors", () => {
  it("expands arguments and animates each step", () => {
    const customCommands = [{ id: "1", name: "git save", description: "Stage and commit", steps: ["git add .", 'git commit -m "$@"'] }];
    const state = ok(starter(), "edit README.md");
    const result = engine.execute('git save "Quick save"', state, { customCommands });
    expect(result.ok).toBe(true);
    expect(result.frames.map((frame) => frame.announce)).toEqual([null, "git add .", 'git commit -m "Quick save"']);
    expect(result.state.commits[headCommitId(result.state)!].message).toBe("Quick save");
  });

  it("stops runaway recursion", () => {
    const customCommands = [{ id: "1", name: "loop", description: "", steps: ["loop"] }];
    const result = engine.execute("loop", starter(), { customCommands });
    expect(result.ok).toBe(false);
  });

  it("suggests typo fixes", () => {
    expect(run(starter(), "git comit -m x").text).toContain("Did you mean git commit?");
    expect(run(starter(), "status").text).toContain("try git status");
  });

  it("requires a repository for git commands", () => {
    const result = run(engine.build([]), "git status");
    expect(result.text).toContain("not a git repository");
  });

  it("autocompletes branches and subcommands", () => {
    const state = ok(starter(), "git branch feature");
    expect(engine.complete("git sw", state).completed).toBe("git switch ");
    expect(engine.complete("git switch fea", state).completed).toBe("git switch feature ");
  });
});

describe(".gitignore", () => {
  it("hides ignored files from status and git add .", () => {
    let state = ok(starter(), 'echo "noise" > debug.log && echo "app()" > app.js && echo "*.log" > .gitignore');
    const status = computeStatus(state);
    expect(status.untracked).toEqual([".gitignore", "app.js"]);
    expect(status.ignored).toEqual(["debug.log"]);
    state = ok(state, "git add .");
    expect(state.index["debug.log"]).toBeUndefined();
    expect(state.index["app.js"]).toBe("app()");
  });

  it("refuses to add an ignored file by name unless forced", () => {
    const state = ok(starter(), 'echo "noise" > debug.log && echo "debug.log" > .gitignore');
    expect(run(state, "git add debug.log").text).toContain("ignored by one of your .gitignore files");
    expect(ok(state, "git add -f debug.log").index["debug.log"]).toBe("noise");
  });
});

describe("stash", () => {
  it("sets work aside and brings it back", () => {
    let state = ok(starter(), 'git switch -c feature && edit README.md "half done"');
    state = ok(state, "git stash");
    expect(state.workdir["README.md"]).toBe("hello");
    expect(state.stash).toHaveLength(1);
    state = ok(state, 'git switch main && echo "fix" > fix.txt && git add . && git commit -m "Fix" && git switch feature');
    state = ok(state, "git stash pop");
    expect(state.workdir["README.md"]).toBe("hello\nhalf done");
    expect(state.stash).toHaveLength(0);
  });

  it("does nothing when there is nothing to stash", () => {
    expect(run(starter(), "git stash").text).toContain("No local changes to save");
  });
});

describe("remotes", () => {
  const URL = "https://github.com/team/site";
  const hosted = () =>
    engine.build([
      `server create ${URL}`,
      `server commit ${URL} "Initial commit" --file README.md --content "# Site"`,
      `server commit ${URL} "Add homepage" --file index.html --content "<h1>Hi</h1>"`,
    ]);

  it("clones a hosted repository", () => {
    const state = ok(hosted(), `git clone ${URL}`);
    expect(state.initialized).toBe(true);
    expect(state.remotes.origin).toBe(URL);
    expect(state.workdir["index.html"]).toBe("<h1>Hi</h1>");
    expect(state.remoteRefs["origin/main"]).toBe(state.branches.main);
    expect(state.upstreams.main).toBe("origin/main");
  });

  it("fetches without touching local branches, then pulls", () => {
    let state = ok(hosted(), `git clone ${URL}`);
    const before = state.branches.main;
    state = ok(state, `server commit ${URL} "Teammate change" --file TEAM.md`);
    state = ok(state, "git fetch");
    expect(state.branches.main).toBe(before);
    expect(state.remoteRefs["origin/main"]).not.toBe(before);
    expect(run(state, "git status").text).toContain("behind 'origin/main' by 1 commit");
    state = ok(state, "git pull");
    expect(state.branches.main).toBe(state.remoteRefs["origin/main"]);
    expect(state.workdir["TEAM.md"]).toBe("Teammate change");
  });

  it("rejects a push when the remote has new work, and succeeds after pulling", () => {
    let state = ok(hosted(), `git clone ${URL}`);
    state = ok(state, 'echo "about" > about.html && git add . && git commit -m "Add about"');
    state = ok(state, `server commit ${URL} "Teammate change" --file TEAM.md`);
    const rejected = run(state, "git push");
    expect(rejected.ok).toBe(false);
    expect(rejected.text).toContain("[rejected]");
    state = ok(state, "git pull && git push");
    const server = state.servers[URL];
    expect(server.branches.main).toBe(state.branches.main);
    expect(server.commits[server.branches.main].tree["about.html"]).toBe("about");
  });

  it("publishes a new branch with -u", () => {
    let state = ok(hosted(), `git clone ${URL}`);
    state = ok(state, 'git switch -c feature && edit feature.txt && git add . && git commit -m "Feature"');
    expect(run(state, "git push").text).toContain("has no upstream branch");
    state = ok(state, "git push -u origin feature");
    expect(state.servers[URL].branches.feature).toBe(state.branches.feature);
    expect(state.upstreams.feature).toBe("origin/feature");
  });

  it("creates a tracking branch when switching to a remote-only branch", () => {
    let state = ok(hosted(), `server commit ${URL} "Docs" --file docs.md --branch docs`);
    state = ok(state, `git clone ${URL}`);
    state = ok(state, "git switch docs");
    expect(state.head).toEqual({ kind: "branch", name: "docs" });
    expect(state.upstreams.docs).toBe("origin/docs");
    expect(state.workdir["docs.md"]).toBe("Docs");
  });
});
