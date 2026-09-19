import { describe, expect, test } from "vitest";
import { levelEntries, levelGoalState, levelStartState } from "@/content";
import { engine } from "@/engine";
import { RAILWAY_METRICS, SPACE_METRICS } from "../scene/skins/metrics";
import { FULL_METRICS, type ListMetrics, MINI_METRICS, horizontalBounds, layoutLinkedList } from "./layout";

/** [name, metrics, room a commit's name takes below it (0 = drawn inside), half the width of that name]. */
const METRICS: Array<[string, ListMetrics, number, number]> = [
  ["linked list", FULL_METRICS, 0, 0],
  ["mini", MINI_METRICS, 0, 0],
  ["railway", RAILWAY_METRICS, 54, 92],
  ["space", SPACE_METRICS, 58, 92],
];

describe.each(METRICS)("linked-list layout (%s)", (_, m, labelBelow, labelHalf) => {
  test("every level's start and goal fit inside the layout bounds", () => {
    for (const { level } of levelEntries) {
      for (const state of [levelStartState(level), levelGoalState(level)]) {
        const layout = layoutLinkedList(state, m);
        for (const node of layout.nodes) {
          expect(node.y + m.nodeH / 2 + labelBelow, `${level.id}: commit ${node.shortId}`).toBeLessThanOrEqual(layout.height);
          expect(node.x - labelHalf, `${level.id}: name of ${node.shortId}`).toBeGreaterThanOrEqual(0);
          expect(node.x + labelHalf, `${level.id}: name of ${node.shortId}`).toBeLessThanOrEqual(layout.width);
        }
        for (const pointer of layout.pointers) {
          expect(pointer.y - m.pillH / 2, `${level.id}: ${pointer.name}`).toBeGreaterThanOrEqual(0);
        }
        // The board draws the padded box as-is; previews fit to horizontalBounds instead.
        if (m !== MINI_METRICS) {
          const { left, right } = horizontalBounds(layout, m);
          expect(left, level.id).toBeGreaterThanOrEqual(0);
          expect(right, level.id).toBeLessThanOrEqual(layout.width);
        }
      }
    }
  });

  test("the current branch sits in the top row, so HEAD's arrow crosses no other pill", () => {
    const state = engine.build([
      'echo "x" > a.txt',
      "git init",
      "git add .",
      'git commit -m "One"',
      "git branch a-very-long-branch-name",
      "git branch another-long-branch",
      "git tag v1.0.0-release-candidate",
    ]);
    const layout = layoutLinkedList(state, m);
    const onCommit = layout.pointers.filter((pointer) => pointer.kind !== "head");
    const main = onCommit.find((pointer) => pointer.name === "main")!;
    expect(new Set(onCommit.map((pointer) => pointer.y)).size).toBeGreaterThan(1);
    expect(main.y).toBe(Math.min(...onCommit.map((pointer) => pointer.y)));
  });
});
