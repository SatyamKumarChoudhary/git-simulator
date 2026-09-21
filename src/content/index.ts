import { type RepoState, engine, resolveRevision, shortId, statesEqual } from "@/engine";
import { type Curriculum, type LevelEntry, buildCurriculum, placeTopics } from "./registry";
import { topicInserts, topicsInOrder } from "./topics";
import type { LevelDefinition, TopicDefinition } from "./types";

/**
 * The assembled curriculum. Everything about order and numbering is derived here, so inserting a question or a
 * topic anywhere in the lists is all it takes — see documentation/adding-content.md.
 */
export const curriculum: Curriculum = buildCurriculum(placeTopics(topicsInOrder, topicInserts));

/** Topics in play order, each with its own map. */
export const topics: readonly TopicDefinition[] = curriculum.topics;

/** Every question in play order, numbered globally and within its topic. */
export const levelEntries: readonly LevelEntry[] = curriculum.levels;

export function findLevel(id: string): LevelEntry | undefined {
  return curriculum.find(id);
}

export function nextLevel(id: string): LevelEntry | undefined {
  return curriculum.next(id);
}

export function previousLevel(id: string): LevelEntry | undefined {
  return curriculum.previous(id);
}

/** The questions of one topic, in order — a topic's own map. */
export function topicLevels(topicId: string): readonly LevelEntry[] {
  return curriculum.levelsOf(topicId);
}

/** Older name for `topics`, kept so existing imports keep working. */
export const worlds: readonly TopicDefinition[] = curriculum.topics;

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

export { sandboxPresets } from "./sandbox-presets";
export {
  ContentError,
  buildCurriculum,
  curriculumProblems,
  defineLevel,
  defineTopic,
  phaseOf,
  placeLevels,
  placeTopics,
  type Curriculum,
  type Insert,
  type LevelEntry,
  type LevelInsert,
  type Placement,
  type TopicInsert,
} from "./registry";
export type {
  GoalContext,
  Goal,
  LevelDefinition,
  LevelPhase,
  SandboxPreset,
  TopicDefinition,
  TopicInput,
  TopicTheme,
  // Older names, still exported so existing imports keep working.
  WorldDefinition,
  WorldTheme,
} from "./types";
