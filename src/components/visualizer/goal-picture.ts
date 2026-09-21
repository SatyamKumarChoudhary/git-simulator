import { type LevelDefinition, levelGoalState, levelStartState } from "@/content";
import { type EngineEvent, type RepoState, reachableCommits } from "@/engine";
import { MINI_METRICS, layoutLinkedList } from "./linked-list/layout";
import { buildZones } from "./zones-model";

/** Everything the goal board needs to draw the repository the level asks for. */
export interface GoalPicture {
  /** The repository to draw: the goal, minus commits the solution leaves behind. */
  repo: RepoState;
  /** Commits that don't exist yet, so they can pop in when the board arrives. */
  arrivals: EngineEvent[];
  /** Whether the diagram itself changes; if it doesn't, the answer is in the file areas below it. */
  history: boolean;
  /** Whether the level changes the repository at all — "read the history" levels don't. */
  changes: boolean;
}

/** What the history diagram shows: commits (and whether they're still reachable) and where every pointer points. */
function historyKey(state: RepoState): string {
  const layout = layoutLinkedList(state, MINI_METRICS);
  return JSON.stringify([layout.nodes.map((node) => [node.id, node.reachable]), layout.pointers.map((pointer) => [pointer.key, pointer.target])]);
}

/** The files in each of the three areas, which is what the strip under the board draws. */
function zonesKey(state: RepoState): string {
  const zones = buildZones(state);
  return JSON.stringify([zones.work, zones.stage, zones.repo].map((zone) => zone.map((card) => [card.path, card.status])));
}

/** The goal without the commits the solution leaves behind, so the picture shows only what you end up with. */
function withoutAbandoned(goal: RepoState, start: RepoState): RepoState {
  const before = reachableCommits(start);
  const after = reachableCommits(goal);
  return { ...goal, commits: Object.fromEntries(Object.entries(goal.commits).filter(([id]) => after.has(id) || !before.has(id))) };
}

/**
 * Works out what the finished repository looks like: the diagram for the board, and the state whose file areas the
 * strip below it draws. Every level has one, including the levels that only ask you to look at something — there the
 * board says so rather than quietly disappearing. Memoise on the level: it replays the level's setup twice.
 */
export function goalPictureOf(level: LevelDefinition): GoalPicture {
  const start = levelStartState(level);
  const goal = levelGoalState(level);
  const history = historyKey(start) !== historyKey(goal);
  const changes = history || zonesKey(start) !== zonesKey(goal);

  const repo = withoutAbandoned(goal, start);
  const arrivals: EngineEvent[] = Object.keys(repo.commits)
    .filter((id) => !start.commits[id])
    .map((id) => ({ type: "commit", id, kind: "normal" }));
  return { repo, arrivals, history, changes };
}
