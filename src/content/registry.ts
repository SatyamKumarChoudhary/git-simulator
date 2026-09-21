import type { LevelDefinition, LevelPhase, TopicDefinition, TopicInput } from "./types";

/**
 * The content registry: it turns a list of topics into the playable curriculum, and it lets new questions and whole
 * topics be inserted at any position without renumbering anything by hand. Order comes from the lists alone —
 * level numbers, "n of m" counters and the unlock chain are all derived, never stored.
 */

/** Thrown when content can't be assembled — always a mistake in the content files, never in user input. */
export class ContentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContentError";
  }
}

/** Where an item goes when it is added to an existing list. `at` is 1-based, like the position a player sees. */
export type Placement = { at: "start" | "end" | number } | { after: string } | { before: string };

export interface Insert<T> {
  item: T;
  place: Placement;
}

export type LevelInsert = Insert<LevelDefinition>;
export type TopicInsert = Insert<TopicDefinition>;

function indexFor(ids: readonly string[], place: Placement, what: string): number {
  if ("after" in place) {
    const index = ids.indexOf(place.after);
    if (index < 0) throw new ContentError(`Cannot place ${what} after "${place.after}": no such id in this list.`);
    return index + 1;
  }
  if ("before" in place) {
    const index = ids.indexOf(place.before);
    if (index < 0) throw new ContentError(`Cannot place ${what} before "${place.before}": no such id in this list.`);
    return index;
  }
  if (place.at === "start") return 0;
  if (place.at === "end") return ids.length;
  if (!Number.isInteger(place.at) || place.at < 1 || place.at > ids.length + 1) {
    throw new ContentError(`Cannot place ${what} at position ${place.at}: the list has ${ids.length} items, so 1…${ids.length + 1} are valid.`);
  }
  return place.at - 1;
}

/** Inserts items into a list at the positions they ask for. Later inserts see the results of earlier ones. */
export function placeItems<T>(items: readonly T[], inserts: readonly Insert<T>[], idOf: (item: T) => string, what: string): T[] {
  const result = [...items];
  for (const insert of inserts) {
    result.splice(indexFor(result.map(idOf), insert.place, `${what} "${idOf(insert.item)}"`), 0, insert.item);
  }
  return result;
}

export const placeLevels = (levels: readonly LevelDefinition[], inserts: readonly LevelInsert[] = []): LevelDefinition[] =>
  placeItems(levels, inserts, (level) => level.id, "level");

export const placeTopics = (topics: readonly TopicDefinition[], inserts: readonly TopicInsert[] = []): TopicDefinition[] =>
  placeItems(topics, inserts, (topic) => topic.id, "topic");

export const phaseOf = (level: LevelDefinition): LevelPhase => level.phase ?? "learn";

/** Checks one question is complete. Use it when a level lives in its own file; defineTopic runs it for you. */
export function defineLevel(level: LevelDefinition): LevelDefinition {
  const problems = levelProblems(level);
  if (problems.length > 0) throw new ContentError(`Level "${level.id}": ${problems.join("; ")}`);
  return level;
}

function levelProblems(level: LevelDefinition): string[] {
  const problems: string[] = [];
  if (!/^[a-z0-9-]+$/.test(level.id)) problems.push("id must be lowercase letters, digits and dashes");
  if (!level.title.trim()) problems.push("needs a title");
  if (!level.mission.trim()) problems.push("needs a mission");
  if (!level.concept.title.trim() || !level.concept.body.trim()) problems.push("needs a concept title and body");
  if (level.goals.length === 0) problems.push("needs at least one goal");
  if (level.hints.length === 0) problems.push("needs at least one hint");
  if (level.solution.length === 0) problems.push("needs a reference solution");
  if (level.xp <= 0) problems.push("needs xp above 0");
  const goalIds = level.goals.map((goal) => goal.id);
  const duplicateGoal = goalIds.find((id, i) => goalIds.indexOf(id) !== i);
  if (duplicateGoal) problems.push(`has two goals with the id "${duplicateGoal}"`);
  return problems;
}

/**
 * Declares a topic: its own map, its own list of questions. `levels` is the order players see; `inserts` adds
 * questions at a position without touching that list (handy for extra packs or work in progress).
 */
export function defineTopic(input: TopicInput): TopicDefinition {
  const levels = placeLevels(input.levels, input.inserts);
  if (levels.length === 0) throw new ContentError(`Topic "${input.id}" has no levels.`);

  const ids = levels.map((level) => level.id);
  const duplicate = ids.find((id, i) => ids.indexOf(id) !== i);
  if (duplicate) throw new ContentError(`Topic "${input.id}" lists the level "${duplicate}" twice.`);
  for (const level of levels) {
    const problems = levelProblems(level);
    if (problems.length > 0) throw new ContentError(`Level "${level.id}" in topic "${input.id}": ${problems.join("; ")}`);
  }

  return { id: input.id, title: input.title, emoji: input.emoji, tagline: input.tagline, theme: input.theme, levels };
}

export interface LevelEntry {
  level: LevelDefinition;
  topic: TopicDefinition;
  /** Position across every topic (0-based) — what the map numbers count. */
  index: number;
  /** Position within its own topic (1-based) — the "n of m" in the mission panel. */
  number: number;
  /** Position of the topic itself (0-based). */
  topicIndex: number;
}

export interface Curriculum {
  topics: readonly TopicDefinition[];
  levels: readonly LevelEntry[];
  find(levelId: string): LevelEntry | undefined;
  next(levelId: string): LevelEntry | undefined;
  previous(levelId: string): LevelEntry | undefined;
  topicOf(topicId: string): TopicDefinition | undefined;
  levelsOf(topicId: string): readonly LevelEntry[];
}

/** Numbers every question in list order and builds the lookups the app needs. Throws on clashing ids. */
export function buildCurriculum(topics: readonly TopicDefinition[]): Curriculum {
  if (topics.length === 0) throw new ContentError("The curriculum has no topics.");
  const topicIds = topics.map((topic) => topic.id);
  const duplicateTopic = topicIds.find((id, i) => topicIds.indexOf(id) !== i);
  if (duplicateTopic) throw new ContentError(`Two topics share the id "${duplicateTopic}".`);

  const levels: LevelEntry[] = [];
  const byId = new Map<string, LevelEntry>();
  topics.forEach((topic, topicIndex) => {
    topic.levels.forEach((level, position) => {
      if (byId.has(level.id)) throw new ContentError(`Two levels share the id "${level.id}" (in "${byId.get(level.id)!.topic.id}" and "${topic.id}").`);
      const entry: LevelEntry = { level, topic, index: levels.length, number: position + 1, topicIndex };
      levels.push(entry);
      byId.set(level.id, entry);
    });
  });

  const byTopic = new Map(topics.map((topic) => [topic.id, levels.filter((entry) => entry.topic.id === topic.id)]));
  return {
    topics,
    levels,
    find: (levelId) => byId.get(levelId),
    next: (levelId) => {
      const entry = byId.get(levelId);
      return entry ? levels[entry.index + 1] : undefined;
    },
    previous: (levelId) => {
      const entry = byId.get(levelId);
      return entry && entry.index > 0 ? levels[entry.index - 1] : undefined;
    },
    topicOf: (topicId) => topics.find((topic) => topic.id === topicId),
    levelsOf: (topicId) => byTopic.get(topicId) ?? [],
  };
}

/**
 * Teaching rules the tests report on. These are deliberately *not* thrown: a half-finished topic should still run
 * in the browser, it just shouldn't ship. Every topic teaches before it practises, and ends up with a checkpoint.
 */
export function curriculumProblems(curriculum: Curriculum): string[] {
  const problems: string[] = [];
  for (const topic of curriculum.topics) {
    const phases = topic.levels.map(phaseOf);
    if (phases[0] !== "learn") problems.push(`${topic.title}: the first level should teach something new (phase "learn"), not "${phases[0]}".`);
    if (!phases.includes("practice")) problems.push(`${topic.title}: no practice level — every idea needs a second run in a fresh situation.`);
    if (!phases.includes("checkpoint")) problems.push(`${topic.title}: no checkpoint level to pull the topic together.`);
    if (phases[0] === "checkpoint") problems.push(`${topic.title}: a checkpoint can't be the first level.`);
  }
  return problems;
}
