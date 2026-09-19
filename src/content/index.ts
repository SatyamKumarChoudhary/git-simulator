import { type RepoState, engine, resolveRevision, shortId, statesEqual } from "@/engine";
import type { LevelDefinition, SandboxPreset, WorldDefinition } from "./types";
import { branchesWorld } from "./worlds/branches";
import { everydayWorld } from "./worlds/everyday";
import { gettingStartedWorld } from "./worlds/getting-started";
import { mergingWorld } from "./worlds/merging";
import { remotesWorld } from "./worlds/remotes";
import { rewriteWorld } from "./worlds/rewrite";
import { tagsStashWorld } from "./worlds/tags-stash";
import { teamworkWorld } from "./worlds/teamwork";
import { undoWorld } from "./worlds/undo";

/**
 * Units in play order — each level teaches one new idea, so difficulty climbs gently.
 * Add a unit by creating a module in ./worlds and listing it here.
 */
export const worlds: readonly WorldDefinition[] = [
  gettingStartedWorld,
  everydayWorld,
  remotesWorld,
  branchesWorld,
  mergingWorld,
  undoWorld,
  tagsStashWorld,
  rewriteWorld,
  teamworkWorld,
];

export interface LevelEntry {
  level: LevelDefinition;
  world: WorldDefinition;
  /** Position across all worlds (0-based). */
  index: number;
  /** Position within its world (1-based). */
  number: number;
}

export const levelEntries: readonly LevelEntry[] = worlds.flatMap((world) =>
  world.levels.map((level, i) => ({ level, world, number: i + 1, index: 0 })),
).map((entry, index) => ({ ...entry, index }));

export function findLevel(id: string): LevelEntry | undefined {
  return levelEntries.find((entry) => entry.level.id === id);
}

export function nextLevel(id: string): LevelEntry | undefined {
  const entry = findLevel(id);
  return entry ? levelEntries[entry.index + 1] : undefined;
}

export function previousLevel(id: string): LevelEntry | undefined {
  const entry = findLevel(id);
  return entry && entry.index > 0 ? levelEntries[entry.index - 1] : undefined;
}

const startStates = new Map<string, RepoState>();

export function levelStartState(level: LevelDefinition): RepoState {
  let state = startStates.get(level.id);
  if (!state) {
    state = engine.build(level.setup);
    startStates.set(level.id, state);
  }
  return state;
}

/** The reference solution with `{{rev:X}}` placeholders replaced by real commit ids from the starting repository. */
export function levelSolution(level: LevelDefinition): string[] {
  const start = levelStartState(level);
  return level.solution.map((command) => command.replace(/\{\{rev:([^}]+)\}\}/g, (_, revision: string) => shortId(resolveRevision(start, revision))));
}

interface Solved {
  /** The repository after playing the reference solution. */
  goal: RepoState;
  /** The number of state-changing commands in the reference solution. */
  par: number;
}

const solved = new Map<string, Solved>();

function solve(level: LevelDefinition): Solved {
  let result = solved.get(level.id);
  if (!result) {
    let par = 0;
    let state = levelStartState(level);
    for (const command of levelSolution(level)) {
      const next = engine.execute(command, state).state;
      if (!statesEqual(state, next)) par++;
      state = next;
    }
    result = { goal: state, par };
    solved.set(level.id, result);
  }
  return result;
}

/** The number of state-changing commands in the reference solution. */
export function levelPar(level: LevelDefinition): number {
  return solve(level).par;
}

/** What the repository looks like once the level is solved — drawn as the level's goal picture. */
export function levelGoalState(level: LevelDefinition): RepoState {
  return solve(level).goal;
}

export const sandboxPresets: readonly SandboxPreset[] = [
  {
    id: "fresh-project",
    title: "Fresh project",
    emoji: "🌱",
    description: "A few files that aren't in Git yet.",
    setup: ['echo "# My Project" > README.md', 'echo "<h1>Hi</h1>" > index.html', 'echo "body { margin: 0; }" > style.css'],
  },
  {
    id: "history",
    title: "Some history",
    emoji: "📚",
    description: "A repository with a few commits on main.",
    setup: [
      'echo "# My Project" > README.md',
      "git init",
      "git add .",
      'git commit -m "Initial commit"',
      'echo "<h1>Hi</h1>" > index.html',
      "git add .",
      'git commit -m "Add homepage"',
      'echo "body { margin: 0; }" > style.css',
      "git add .",
      'git commit -m "Add styles"',
    ],
  },
  {
    id: "diverged",
    title: "Diverged branches",
    emoji: "🌿",
    description: "main and feature both have new commits. Try merge vs rebase!",
    setup: [
      'echo "# My Project" > README.md',
      "git init",
      "git add .",
      'git commit -m "Initial commit"',
      "git switch -c feature",
      'echo "login()" > login.js',
      "git add .",
      'git commit -m "Add login"',
      'edit login.js "logout()"',
      'git commit -am "Add logout"',
      "git switch main",
      'echo "<h1>Docs</h1>" > docs.html',
      "git add .",
      'git commit -m "Add docs"',
    ],
  },
  {
    id: "team-project",
    title: "Team project",
    emoji: "☁️",
    description: "A cloned GitHub repo. Try server commit to play a teammate, then fetch, pull and push.",
    setup: [
      "server create https://github.com/team/project",
      'server commit https://github.com/team/project "Initial commit" --file README.md --content "# Project"',
      'server commit https://github.com/team/project "Add homepage" --file index.html --content "<h1>Hi</h1>"',
      "git clone https://github.com/team/project",
    ],
  },
  {
    id: "conflict",
    title: "Conflict waiting to happen",
    emoji: "💥",
    description: "Both branches edited the same line. Run git merge feature.",
    setup: [
      'echo "color = blue" > config.txt',
      "git init",
      "git add .",
      'git commit -m "Initial config"',
      "git switch -c feature",
      'echo "color = green" > config.txt',
      'git commit -am "Go green"',
      "git switch main",
      'echo "color = red" > config.txt',
      'git commit -am "Go red"',
    ],
  },
];

export type { GoalContext, Goal, LevelDefinition, LevelPhase, WorldDefinition, SandboxPreset, WorldTheme } from "./types";
