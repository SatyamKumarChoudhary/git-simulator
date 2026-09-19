import { ancestorsIn } from "../../core/graph";
import { shortId } from "../../core/refs";
import { DEFAULT_BRANCH } from "../../core/constants";
import type { Commit, HostedRepo, RepoState } from "../../core/types";
import { own } from "../../core/utils";
import type { CommandContext } from "../types";

export const TEAMMATE = "Sam (teammate) <sam@gitquest.dev>";

export function isUrl(value: string): boolean {
  return /^(https?:\/\/|git@)[^\s]+$/.test(value);
}

/** The hosted repository at `url`, created empty when it doesn't exist yet (like making a repo on GitHub). */
export function ensureServer(state: RepoState, url: string): HostedRepo {
  const existing = own(state.servers, url);
  if (existing) return existing;
  const created: HostedRepo = { commits: {}, branches: {}, defaultBranch: DEFAULT_BRANCH };
  state.servers[url] = created;
  return created;
}

export function requireServer(ctx: CommandContext, url: string): HostedRepo {
  const server = own(ctx.state.servers, url);
  if (!server) {
    ctx.fail(`fatal: repository '${url}' not found`, "Check the URL — the simulator only knows repositories created in this level or sandbox.");
  }
  return server;
}

/** Resolves a remote name (default: origin, or the only remote) to its name and URL. */
export function requireRemote(ctx: CommandContext, name?: string): { name: string; url: string } {
  const remotes = Object.keys(ctx.state.remotes);
  const chosen = name ?? (own(ctx.state.remotes, "origin") ? "origin" : remotes.length === 1 ? remotes[0] : undefined);
  if (!chosen || own(ctx.state.remotes, chosen) === undefined) {
    ctx.fail(
      `fatal: '${chosen ?? "origin"}' does not appear to be a git repository`,
      remotes.length === 0
        ? "This repository has no remote yet. Connect one with git remote add origin <url>."
        : `Known remotes: ${remotes.join(", ")}.`,
    );
  }
  return { name: chosen, url: ctx.state.remotes[chosen] };
}

/** Copies every commit reachable from `tip` that `to` doesn't have yet. Returns how many were copied. */
export function copyCommits(from: Record<string, Commit>, to: Record<string, Commit>, tip: string): number {
  let copied = 0;
  for (const id of ancestorsIn(from, tip)) {
    if (Object.hasOwn(to, id)) continue;
    to[id] = structuredClone(from[id]);
    copied++;
  }
  return copied;
}

export interface FetchLine {
  branch: string;
  from: string | null;
  to: string;
}

/** Downloads everything from a remote and moves the remote-tracking branches. */
export function fetchFromRemote(ctx: CommandContext, remote: { name: string; url: string }): FetchLine[] {
  const state = ctx.state;
  const server = requireServer(ctx, remote.url);
  const lines: FetchLine[] = [];
  for (const [branch, tip] of Object.entries(server.branches)) {
    copyCommits(server.commits, state.commits, tip);
    const ref = `${remote.name}/${branch}`;
    const previous = own(state.remoteRefs, ref) ?? null;
    if (previous !== tip) {
      state.remoteRefs[ref] = tip;
      lines.push({ branch, from: previous, to: tip });
    }
  }
  return lines;
}

export function printFetchLines(ctx: CommandContext, url: string, remoteName: string, lines: FetchLine[]): void {
  if (lines.length === 0) return;
  ctx.print(`From ${url}`, "muted");
  for (const line of lines) {
    const range = line.from ? `   ${shortId(line.from)}..${shortId(line.to)}` : " * [new branch]     ";
    ctx.print(`${range}  ${line.branch.padEnd(10)} -> ${remoteName}/${line.branch}`);
  }
}

/** Ahead/behind counts between a local branch and its upstream (only counting commits we know about). */
export function trackingCounts(state: RepoState, localTip: string, upstreamTip: string): { ahead: number; behind: number } {
  const local = ancestorsIn(state.commits, localTip);
  const remote = ancestorsIn(state.commits, upstreamTip);
  return {
    ahead: [...local].filter((id) => !remote.has(id)).length,
    behind: [...remote].filter((id) => !local.has(id)).length,
  };
}
