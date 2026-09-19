import { ancestorsIn } from "../../core/graph";
import { resolveRevision, shortId } from "../../core/refs";
import { currentBranch, getCommit, headCommitId, recordReflog } from "../../core/repo";
import { own, pluralize } from "../../core/utils";
import { flag } from "../../parser/args";
import { requireHeadCommit, requireNoMerge } from "../shared/guards";
import { applySnapshotChange } from "../shared/worktree";
import {
  copyCommits,
  ensureServer,
  fetchFromRemote,
  isUrl,
  printFetchLines,
  requireRemote,
  requireServer,
} from "../shared/remote";
import { type CommandContext, defineCommand } from "../types";
import { mergeCommitInto } from "./merge";

export const remoteCommand = defineCommand({
  program: "git",
  name: "remote",
  category: "remote",
  summary: "Connect your repository to one hosted online",
  usage: ["git remote -v", "git remote add <name> <url>", "git remote remove <name>"],
  description: "A remote is a named link (usually 'origin') to a copy of the repository on a server such as GitHub.",
  examples: ["git remote add origin https://github.com/you/project", "git remote -v"],
  options: {
    verbose: { short: "v", long: "verbose", description: "Show the URLs too" },
  },
  run(ctx: CommandContext) {
    const state = ctx.state;
    const [action, name, url] = ctx.args.positionals;

    if (!action) {
      const names = Object.keys(state.remotes);
      if (names.length === 0) ctx.print("(no remotes yet)", "muted");
      for (const remote of names) {
        if (flag(ctx.args, "verbose")) {
          ctx.print(`${remote}\t${state.remotes[remote]} (fetch)`);
          ctx.print(`${remote}\t${state.remotes[remote]} (push)`);
        } else ctx.print(remote);
      }
      return;
    }

    if (action === "add") {
      if (!name || !url) ctx.fail("usage: git remote add <name> <url>", "For example: git remote add origin https://github.com/you/project");
      if (own(state.remotes, name) !== undefined) ctx.fail(`error: remote ${name} already exists.`, "Use a different name, or remove it first with git remote remove.");
      if (!isUrl(url)) ctx.fail(`fatal: '${url}' does not look like a repository URL`, "URLs look like https://github.com/you/project");
      state.remotes[name] = url;
      ensureServer(state, url);
      ctx.narrate({
        icon: "🔗",
        title: `Remote '${name}' added`,
        body: `'${name}' is now a nickname for ${url}. Nothing was uploaded yet — use git push to send commits there.`,
      });
      return;
    }

    if (action === "remove" || action === "rm") {
      if (!name || own(state.remotes, name) === undefined) ctx.fail(`error: No such remote: '${name ?? ""}'`, "Run git remote -v to list remotes.");
      delete state.remotes[name];
      for (const ref of Object.keys(state.remoteRefs)) if (ref.startsWith(`${name}/`)) delete state.remoteRefs[ref];
      for (const [branch, upstream] of Object.entries(state.upstreams)) if (upstream.startsWith(`${name}/`)) delete state.upstreams[branch];
      ctx.narrate({ icon: "✂️", title: `Remote '${name}' removed`, body: "The link is gone. Your local commits are untouched." });
      return;
    }

    ctx.fail(`error: Unknown subcommand: ${action}`, "Try git remote -v, git remote add <name> <url> or git remote remove <name>.");
  },
});

export const cloneCommand = defineCommand({
  program: "git",
  name: "clone",
  category: "remote",
  summary: "Download a repository and its whole history",
  usage: ["git clone <url>"],
  description: "In the simulator the project folder itself becomes the clone, so start from an empty folder.",
  examples: ["git clone https://github.com/team/website"],
  requiresRepo: false,
  run(ctx: CommandContext) {
    const state = ctx.state;
    const [url] = ctx.args.positionals;
    if (!url) ctx.fail("fatal: You must specify a repository to clone.", "Usage: git clone <url>");
    if (state.initialized || Object.keys(state.workdir).length > 0) {
      ctx.fail(
        "fatal: destination path already exists and is not an empty directory.",
        "In the simulator, git clone downloads into this project folder, so the folder must be empty.",
      );
    }
    const server = requireServer(ctx, url);
    const name = url.replace(/\/+$/, "").split("/").pop()?.replace(/\.git$/, "") || "project";

    state.initialized = true;
    state.remotes.origin = url;
    for (const [branch, tip] of Object.entries(server.branches)) {
      copyCommits(server.commits, state.commits, tip);
      state.remoteRefs[`origin/${branch}`] = tip;
    }
    const main = server.defaultBranch;
    state.head = { kind: "branch", name: main };
    const tip = own(server.branches, main);
    ctx.print(`Cloning into '${name}'...`);
    if (tip) {
      state.branches[main] = tip;
      state.upstreams[main] = `origin/${main}`;
      state.index = { ...state.commits[tip].tree };
      state.workdir = { ...state.commits[tip].tree };
      state.reflog.unshift({ commit: tip, action: `clone: from ${url}` });
      const count = ancestorsIn(state.commits, tip).size;
      ctx.print(`Receiving objects: 100% (${count}/${count}), done.`, "muted");
    } else {
      ctx.print("warning: You appear to have cloned an empty repository.", "warning");
    }
    ctx.emit({ type: "remote-sync", direction: "clone", ref: `origin/${main}` });
    ctx.narrate({
      icon: "📥",
      title: "Cloned!",
      body: `You now have a full copy of ${url}: every commit, plus a local '${main}' branch. 'origin' remembers where it came from, and origin/${main} shows where the remote's ${main} was.`,
    });
  },
});

export const fetchCommand = defineCommand({
  program: "git",
  name: "fetch",
  category: "remote",
  summary: "Download new commits from a remote (without changing your branches)",
  usage: ["git fetch", "git fetch <remote>"],
  examples: ["git fetch", "git fetch origin"],
  run(ctx: CommandContext) {
    const remote = requireRemote(ctx, ctx.args.positionals[0]);
    const lines = fetchFromRemote(ctx, remote);
    printFetchLines(ctx, remote.url, remote.name, lines);
    if (lines.length > 0) ctx.emit({ type: "remote-sync", direction: "fetch", ref: `${remote.name}/${lines[0].branch}` });
    ctx.narrate(
      lines.length === 0
        ? { icon: "✅", title: "Nothing new", body: `${remote.name} has no commits you haven't seen already.` }
        : {
            icon: "📡",
            title: "Fetched new work",
            body: `New commits arrived and ${lines.map((line) => `${remote.name}/${line.branch}`).join(", ")} moved to match the remote. Your own branches did NOT change — merge (or pull) when you're ready.`,
          },
    );
  },
});

export const pullCommand = defineCommand({
  program: "git",
  name: "pull",
  category: "remote",
  summary: "Fetch from the remote and merge into your branch",
  usage: ["git pull", "git pull <remote> <branch>"],
  description: "git pull is simply git fetch followed by git merge.",
  examples: ["git pull", "git pull origin main"],
  run(ctx: CommandContext) {
    const state = ctx.state;
    requireNoMerge(ctx, "Pulling");
    const branch = currentBranch(state);
    const [remoteArg, branchArg] = ctx.args.positionals;
    let upstream: string;
    if (remoteArg) {
      const target = branchArg ?? branch;
      if (!target) ctx.fail("fatal: You are not currently on a branch.", "Switch to a branch before pulling.");
      upstream = `${remoteArg}/${target}`;
    } else {
      const tracked = branch ? own(state.upstreams, branch) : undefined;
      if (!tracked) {
        ctx.fail(
          "There is no tracking information for the current branch.",
          `Tell Git what to pull: git pull origin ${branch ?? "main"} — or set it up once with git push -u origin ${branch ?? "main"}.`,
        );
      }
      upstream = tracked;
    }
    const remoteName = upstream.split("/")[0];
    const remote = requireRemote(ctx, remoteName);

    const lines = fetchFromRemote(ctx, remote);
    printFetchLines(ctx, remote.url, remote.name, lines);
    if (lines.length > 0) {
      ctx.emit({ type: "remote-sync", direction: "fetch", ref: upstream });
      ctx.narrate({ icon: "📡", title: "Step 1: fetch", body: `Downloaded new commits — ${upstream} moved. Now Git merges them into your branch…` });
      ctx.checkpoint();
    }
    const theirs = own(state.remoteRefs, upstream);
    if (!theirs) ctx.fail(`fatal: couldn't find remote ref ${upstream.split("/").slice(1).join("/")}`, "That branch doesn't exist on the remote.");

    // Pulling into a brand-new repository: there is nothing to merge, so the branch simply starts at what the remote has.
    if (!headCommitId(state)) {
      const name = branch ?? upstream.split("/").slice(1).join("/");
      const tree = getCommit(state, theirs).tree;
      state.branches[name] = theirs;
      state.head = { kind: "branch", name };
      state.upstreams[name] = upstream;
      applySnapshotChange(state, {}, tree);
      state.index = { ...tree };
      recordReflog(state, theirs, `pull: ${upstream}`);
      ctx.emit({ type: "head-moved", from: null, to: theirs, branch: name });
      ctx.emit({ type: "remote-sync", direction: "fetch", ref: upstream });
      ctx.print(`Updating ${shortId(theirs)}..${shortId(theirs)}`);
      ctx.print("Fast-forward");
      ctx.narrate({
        icon: "📥",
        title: `'${name}' starts at ${upstream}`,
        body: `Your repository had no commits yet, so the pull simply took everything ${remoteName} has. This is the long way round of git clone.`,
      });
      return;
    }

    requireHeadCommit(ctx);
    mergeCommitInto(ctx, upstream, theirs);
  },
});

export const pushCommand = defineCommand({
  program: "git",
  name: "push",
  category: "remote",
  summary: "Upload your commits to a remote",
  usage: ["git push", "git push -u origin <branch>"],
  description: "Sends your branch's new commits to the remote. It's refused if the remote has commits you don't have yet.",
  examples: ["git push", "git push -u origin feature"],
  options: {
    setUpstream: { short: "u", long: "set-upstream", description: "Remember this remote branch for future push/pull" },
  },
  run(ctx: CommandContext) {
    const state = ctx.state;
    requireHeadCommit(ctx);
    const [remoteArg, branchArg] = ctx.args.positionals;
    const current = currentBranch(state);
    if (!current && !branchArg) ctx.fail("fatal: You are not currently on a branch.", "Switch to a branch before pushing.");
    const branch = branchArg ?? current!;
    const tracked = own(state.upstreams, branch);

    let remoteName: string;
    if (remoteArg) remoteName = remoteArg;
    else if (tracked) remoteName = tracked.split("/")[0];
    else {
      ctx.fail(
        `fatal: The current branch ${branch} has no upstream branch.\nTo push the current branch and set the remote as upstream, use\n\n    git push --set-upstream origin ${branch}`,
        `The first push of a branch needs to say where it goes: git push -u origin ${branch}`,
      );
    }
    const remote = requireRemote(ctx, remoteName);
    const tip = own(state.branches, branch) ?? resolveRevision(state, branch);
    const server = requireServer(ctx, remote.url);
    const serverTip = own(server.branches, branch);

    if (serverTip === tip) {
      ctx.print("Everything up-to-date");
      ctx.narrate({ icon: "✅", title: "Already up to date", body: `${remote.name} already has every commit on ${branch}.` });
      return;
    }
    if (serverTip && !ancestorsIn(state.commits, tip).has(serverTip)) {
      ctx.fail(
        `To ${remote.url}\n ! [rejected]        ${branch} -> ${branch} (fetch first)\nerror: failed to push some refs to '${remote.url}'`,
        "Someone else pushed commits you don't have yet. Run git pull to bring them in, then git push again.",
      );
    }

    const sent = copyCommits(state.commits, server.commits, tip);
    server.branches[branch] = tip;
    state.remoteRefs[`${remote.name}/${branch}`] = tip;
    ctx.print(`To ${remote.url}`, "muted");
    ctx.print(serverTip ? `   ${shortId(serverTip)}..${shortId(tip)}  ${branch} -> ${branch}` : ` * [new branch]      ${branch} -> ${branch}`);
    if (flag(ctx.args, "setUpstream")) {
      state.upstreams[branch] = `${remote.name}/${branch}`;
      ctx.print(`branch '${branch}' set up to track '${remote.name}/${branch}'.`, "success");
    }
    ctx.emit({ type: "remote-sync", direction: "push", ref: `${remote.name}/${branch}` });
    ctx.narrate({
      icon: "🚀",
      title: `Pushed ${branch} to ${remote.name}`,
      body: `${pluralize(sent, "commit")} uploaded. The remote's ${branch} now points at ${shortId(tip)}, and so does ${remote.name}/${branch}. Teammates will get it on their next pull.`,
    });
  },
});
