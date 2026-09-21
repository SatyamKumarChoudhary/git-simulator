import { describe, expect, it } from "vitest";
import { engine } from "@/engine";
import { curriculum, curriculumProblems, levelEntries, levelPar, levelSolution, levelStartState, sandboxPresets } from "./index";

describe("levels", () => {
  it("cover every unit with a gentle ramp", () => {
    expect(levelEntries.length).toBeGreaterThanOrEqual(40);
  });

  it("have unique ids", () => {
    const ids = levelEntries.map((entry) => entry.level.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("teaches each topic as learn → practice → checkpoint", () => {
    // The registry owns these rules so the app and the tests can never disagree about them.
    expect(curriculumProblems(curriculum)).toEqual([]);
  });

  /**
   * Inspection levels — where nothing in the repository changes, so running the command *is* the task.
   * Every other level must be judged by the state you reach, so `git checkout main` and `git switch main`
   * (or any other route) count the same.
   */
  const COMMAND_CHECKED = new Set(["ask-git", "check-then-commit", "read-history", "spot-the-difference", "diff-staged", "compare-commits", "remote-check", "remote-branches"]);

  it("judges levels by state, except the inspection ones", () => {
    const commandChecked: string[] = [];

    for (const { level } of levelEntries) {
      const initial = levelStartState(level);
      let state = initial;
      const commands: string[] = [];
      let dependsOnCommands = false;

      for (const command of levelSolution(level)) {
        const result = engine.execute(command, state);
        for (const frame of result.frames) {
          if (frame.completed?.ok) commands.push(frame.completed.command);
          for (const goal of level.goals) {
            // If forgetting what was typed changes the answer, the goal is judging the route, not the result.
            const withCommands = goal.check({ state: frame.state, initial, commands });
            const withoutCommands = goal.check({ state: frame.state, initial, commands: [] });
            if (withCommands !== withoutCommands) dependsOnCommands = true;
          }
        }
        state = result.state;
      }

      if (dependsOnCommands) commandChecked.push(level.id);
    }

    expect(commandChecked.sort()).toEqual([...COMMAND_CHECKED].sort());
  });

  it("makes every checkpoint recall several steps", () => {
    for (const { level } of levelEntries.filter((entry) => entry.level.phase === "checkpoint")) {
      expect(levelPar(level), level.id).toBeGreaterThanOrEqual(3);
      expect(level.goals.length, level.id).toBeGreaterThanOrEqual(3);
    }
  });

  for (const { level, topic: world } of levelEntries) {
    describe(`${world.title} › ${level.title}`, () => {
      it("is played with git commands only — no file editing", () => {
        expect(levelSolution(level).filter((command) => !command.startsWith("git "))).toEqual([]);
        // Shell commands that write or open files, e.g. `edit index.html`, `echo "…" > style.css`.
        const shellEditing = /\b(echo|edit|touch|cat|nano|vim|code)\s+("|[\w.-]+\.\w+)|\s>{1,2}\s/;
        expect([level.mission, ...level.hints].filter((text) => shellEditing.test(text))).toEqual([]);
      });

      it("starts unsolved", () => {
        const initial = levelStartState(level);
        const ctx = { state: initial, initial, commands: [] };
        expect(level.goals.every((goal) => goal.check(ctx))).toBe(false);
      });

      it("is solved by its reference solution, step by step", () => {
        const initial = levelStartState(level);
        let state = initial;
        const commands: string[] = [];
        const achieved = new Set<string>();

        for (const command of levelSolution(level)) {
          const result = engine.execute(command, state);
          expect(result.ok, `"${command}" failed`).toBe(true);
          for (const frame of result.frames) {
            if (frame.completed?.ok) commands.push(frame.completed.command);
            for (const goal of level.goals) {
              if (goal.sticky && goal.check({ state: frame.state, initial, commands })) achieved.add(goal.id);
            }
          }
          state = result.state;
        }

        const unmet = level.goals.filter((goal) => !(goal.sticky ? achieved.has(goal.id) : goal.check({ state, initial, commands })));
        expect(unmet.map((goal) => goal.label)).toEqual([]);
        // Look-only levels (like running git status) have a par of 0.
        expect(levelPar(level)).toBeGreaterThanOrEqual(0);
      });
    });
  }
});

describe("sandbox presets", () => {
  it("all build successfully", () => {
    for (const preset of sandboxPresets) expect(() => engine.build(preset.setup)).not.toThrow();
  });
});
