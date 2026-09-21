import { describe, expect, it } from "vitest";
import { findLevel, levelEntries, levelStartState } from "@/content";
import { reachableCommits } from "@/engine";
import { goalPictureOf } from "./goal-picture";

const levels = levelEntries.map((entry) => entry.level);
const pictureOf = (id: string) => goalPictureOf(findLevel(id)!.level);

describe("goalPictureOf", () => {
  it("gives every level a board to show", () => {
    expect(levels.every((level) => goalPictureOf(level))).toBe(true);
  });

  it("says a level changes the repository when it does", () => {
    // A commit changes the diagram; staging a file changes only the file areas.
    expect(pictureOf("first-commit")).toMatchObject({ history: true, changes: true });
    expect(pictureOf("stage-fright")).toMatchObject({ history: false, changes: true });
  });

  it("says nothing changes on the levels that only ask you to look", () => {
    for (const id of ["ask-git", "read-history", "compare-commits", "remote-check"]) {
      expect(pictureOf(id), id).toMatchObject({ history: false, changes: false });
    }
  });

  it("marks the commits that don't exist yet, so they can arrive", () => {
    const { repo, arrivals } = pictureOf("first-commit");
    const start = levelStartState(findLevel("first-commit")!.level);
    expect(arrivals.length).toBeGreaterThan(0);
    for (const event of arrivals) {
      expect(event.type).toBe("commit");
      const id = event.type === "commit" ? event.id : "";
      expect(repo.commits[id], "arrivals must be in the picture").toBeDefined();
      expect(start.commits[id], "arrivals must be new").toBeUndefined();
    }
  });

  it("leaves out commits the solution abandons, and keeps the ones it just made", () => {
    // Rewinding drops two commits: the picture shouldn't still be showing them.
    const level = findLevel("rewind")!.level;
    const start = levelStartState(level);
    const { repo } = goalPictureOf(level);
    const abandoned = [...reachableCommits(start)].filter((id) => !reachableCommits(repo).has(id));
    expect(abandoned.length).toBeGreaterThan(0);
    for (const id of abandoned) expect(repo.commits[id], `${id} was left behind`).toBeUndefined();
  });

  it("is a picture of the goal, not of the start", () => {
    // A branch level moves no commits, only pointers — the picture has to show that too.
    for (const id of ["first-commit", "make-a-branch", "paths-meet", "squash"]) {
      const level = findLevel(id)!.level;
      const start = levelStartState(level);
      const { repo, history } = goalPictureOf(level);
      expect(history, id).toBe(true);
      const shape = (state: typeof repo) => ({ commits: Object.keys(state.commits).sort(), branches: state.branches, head: state.head });
      expect(shape(repo), id).not.toEqual(shape(start));
    }
  });
});
