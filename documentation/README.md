# GitQuest documentation

Reference notes for the learning content. Three files:

| File | What's in it |
| --- | --- |
| [curriculum.md](curriculum.md) | Every unit, every level: what it teaches, the question asked, its goals and the reference solution. Generated from `src/content/worlds/*.ts`. |
| [learning-order.md](learning-order.md) | Why the topics are in this order, and the learn → practice → checkpoint pattern each unit follows. |
| [coverage.md](coverage.md) | Which Git topics are covered, which are supported by the simulator but not yet a level, and which aren't simulated at all. |

## Keeping these in sync

`curriculum.md` is written from the level definitions, so regenerate it after changing content rather than editing it by hand. The rules it documents are enforced by tests in `src/content/content.test.ts`:

- every level starts unsolved and is solved by its own reference solution, step by step;
- every level is solvable with git commands only (no file editing);
- every unit starts with a `learn` level, contains at least one `practice` level, and ends with exactly one `checkpoint`;
- every checkpoint needs at least three state-changing commands and three goals.
