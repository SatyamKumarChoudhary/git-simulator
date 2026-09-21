import { describe, expect, it } from "vitest";
import { ContentError, buildCurriculum, defineLevel, defineTopic, placeLevels, placeTopics } from "./registry";
import type { LevelDefinition, TopicDefinition } from "./types";

const level = (id: string, phase: LevelDefinition["phase"] = "learn"): LevelDefinition => ({
  id,
  title: id,
  phase,
  mission: `Do ${id}.`,
  concept: { title: id, body: `About ${id}.` },
  setup: [],
  goals: [{ id: "done", label: "Done", check: () => true }],
  hints: [`Try ${id}.`],
  solution: ["git status"],
  xp: 10,
});

const topic = (id: string, ids: string[]): TopicDefinition =>
  defineTopic({ id, title: id, emoji: "🧪", tagline: id, theme: "sky", levels: ids.map((levelId) => level(levelId)) });

const ids = (levels: readonly LevelDefinition[]) => levels.map((one) => one.id);

describe("placing questions", () => {
  const base = [level("one"), level("two"), level("three")];

  it("inserts after, before and at a numbered position", () => {
    expect(ids(placeLevels(base, [{ item: level("new"), place: { after: "one" } }]))).toEqual(["one", "new", "two", "three"]);
    expect(ids(placeLevels(base, [{ item: level("new"), place: { before: "three" } }]))).toEqual(["one", "two", "new", "three"]);
    expect(ids(placeLevels(base, [{ item: level("new"), place: { at: 2 } }]))).toEqual(["one", "new", "two", "three"]);
    expect(ids(placeLevels(base, [{ item: level("new"), place: { at: "start" } }]))).toEqual(["new", "one", "two", "three"]);
    expect(ids(placeLevels(base, [{ item: level("new"), place: { at: "end" } }]))).toEqual(["one", "two", "three", "new"]);
    // The very end is a valid numbered position too, and later inserts see earlier ones.
    expect(ids(placeLevels(base, [{ item: level("a"), place: { at: 4 } }, { item: level("b"), place: { after: "a" } }]))).toEqual(["one", "two", "three", "a", "b"]);
  });

  it("explains itself when a placement makes no sense", () => {
    expect(() => placeLevels(base, [{ item: level("new"), place: { after: "nope" } }])).toThrow(/after "nope"/);
    expect(() => placeLevels(base, [{ item: level("new"), place: { at: 9 } }])).toThrow(/1…4 are valid/);
  });
});

describe("declaring content", () => {
  it("accepts inserts inside defineTopic", () => {
    const withInsert = defineTopic({
      id: "demo",
      title: "Demo",
      emoji: "🧪",
      tagline: "Demo",
      theme: "sky",
      levels: [level("first"), level("second")],
      inserts: [{ item: level("middle"), place: { after: "first" } }],
    });
    expect(ids(withInsert.levels)).toEqual(["first", "middle", "second"]);
  });

  it("refuses content that would break the app", () => {
    expect(() => defineLevel({ ...level("bad"), goals: [] })).toThrow(ContentError);
    expect(() => defineLevel({ ...level("Bad Id") })).toThrow(/lowercase/);
    expect(() => defineLevel({ ...level("twice"), goals: [{ id: "g", label: "a", check: () => true }, { id: "g", label: "b", check: () => true }] })).toThrow(/two goals/);
    expect(() => topic("empty", [])).toThrow(/no levels/);
    expect(() => topic("dupes", ["same", "same"])).toThrow(/twice/);
    expect(() => buildCurriculum([topic("a", ["shared"]), topic("b", ["shared"])])).toThrow(/share the id "shared"/);
  });
});

describe("numbering", () => {
  it("follows the lists, so inserting anywhere renumbers everything", () => {
    const before = buildCurriculum([topic("first", ["a", "b"]), topic("second", ["c"])]);
    expect(before.levels.map((entry) => [entry.level.id, entry.index, entry.number])).toEqual([
      ["a", 0, 1],
      ["b", 1, 2],
      ["c", 2, 1],
    ]);

    // Drop a question into the middle of the first topic and a whole topic in front of everything.
    const first = defineTopic({ ...before.topics[0], levels: [...before.topics[0].levels], inserts: [{ item: level("inserted"), place: { at: 2 } }] });
    const after = buildCurriculum(placeTopics([first, before.topics[1]], [{ item: topic("zero", ["z"]), place: { at: "start" } }]));

    expect(after.levels.map((entry) => entry.level.id)).toEqual(["z", "a", "inserted", "b", "c"]);
    expect(after.find("inserted")).toMatchObject({ index: 2, number: 2, topicIndex: 1 });
    expect(after.next("a")?.level.id).toBe("inserted");
    expect(after.previous("b")?.level.id).toBe("inserted");
    expect(after.levelsOf("first").map((entry) => entry.level.id)).toEqual(["a", "inserted", "b"]);
    // Ids are the identity, so progress saved against "b" still points at the same question.
    expect(after.find("b")?.level.title).toBe(before.find("b")?.level.title);
  });
});
