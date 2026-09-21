# GitQuest — learn Git by playing

A playful, fully client-side Git simulator. Type real Git commands in a terminal and watch the working directory, staging area, commit graph, branches and HEAD animate in real time. No backend, no accounts — progress and custom commands live in `localStorage`.

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # engine + level tests (vitest)
npm run build    # static production build
```

## What's inside

- **101 questions in 9 topics**, grouped by topic and built the way learning sticks — every unit **teaches** one idea, **practises** it in a fresh situation, and ends with a **checkpoint** that mixes earlier ideas:
  1. **Git basics** (12) — `--version`, `init`, `status`, staging one file / several / `.`, `commit -m`, `config user.name/email`, `log --oneline`, `show`
  2. **Everyday work** (11) — stage → commit loop, `commit -am`, `git diff`, focused commits, `.gitignore`, `git rm`, `git mv`
  3. **Remote repository** (9) — `clone`, `push`, `fetch`, `pull`, `remote add origin`, `branch -M main`, `push -u origin main`
  4. **Branches** (13) — create, switch, commit on a branch, `branch -m` / `-c`, diverging history, `switch -c`, detached HEAD
  5. **Merging** (11) — fast-forward, merge commits, merge direction, deleting merged branches, conflicts (`--ours` / `--theirs`), `merge --abort`
  6. **Rollback** (20) — `restore` / `checkout <file>`, `restore --staged` / `reset HEAD`, `diff` and `diff --cached`, `diff <old>..<new>`, `--amend`, `reset --soft` / `--hard`, `revert`, `reflog`
  7. **Tags & stash** (9) — release tags, tagging the past, `tag -d`, `stash` / `pop`, picking from the stash stack
  8. **Rewrite history** (8) — cherry-pick (by branch and id), rebase, rebase + fast-forward, squash
  9. **Working with a team** (8) — remote branches, publishing a branch, pushing again, rejected pushes, a full round trip
  Questions are tagged **Practice** or **Checkpoint** in the mission panel, and each command comes back in two to four different situations so it is practised, not just met once. Tests enforce the shape: every topic starts by teaching, has practice, and has a checkpoint that needs at least three steps.
- **Judged by the end state, not the route**: goals check the repository you reach, so `git switch main` and `git checkout main` both count, as do `git add a b` vs two adds, `git commit -am` vs add + commit, `git pull` vs `fetch` + `merge`, `restore --staged` vs `reset <file>` vs `rm --cached`, `HEAD~1` vs `HEAD^`, and so on. `src/content/alternatives.test.ts` walks a different route through every question to keep it that way.
- **Git commands only**: no level asks you to open or edit a file. Any file changes a level needs are already made when it starts — you stage, commit, branch, merge and undo them with git. Merge conflicts are resolved by picking a side (`git checkout --ours` / `--theirs`). A content test enforces this for every level.
- **Journey map** — the home page is just the map: a snaking game board (levels run left→right, then right→left) of glossy 3D coins on a raised road that fills with the unit's colour as you progress, a soft wash of that colour behind each unit, a trophy marker on checkpoints, and it scrolls to the level you're on: levels unlock one at a time (clear a level to open the next). Each level has a short mission and a live goal checklist; the concept, graded hints and solution stay hidden behind a **?** button until you ask. Stars and XP on completion.
- **Goal picture** on every level that changes something: a small linked-list diagram (plus file trays when staging matters) that plays Start → Goal when the level opens. Toggle Start / Goal any time to watch the history morph; new commits are marked ✦ NEW, abandoned ones fade away, and the card turns into "Goal reached" when you're done.
- **Sandbox** with preset starting repositories.
- **Linked-list view** (default): a minimal diagram where every commit points to its parent, branch and tag pointers point at commits, `HEAD` points at its branch (or straight at a commit when detached) and `MERGE_HEAD` appears during a conflicted merge. Changes play out in order — a new commit is born from its parent, its arrow draws back to the parent, then the branch and HEAD glide over — and arrows stay attached while things move. A **?** next to "History" explains how to read the diagram. Switch views from the top-right corner.
- **Two more looks for the same diagram** (switch any time top right, choice is remembered). They use the exact same layout and animation order as the linked list, so nothing changes meaning — only the drawing:
  - **Railway** — a metro map: each branch is a coloured line, commits are stations with their name underneath, branches are signposts, and HEAD is the train.
  - **Space** — commits are planets joined by routes that point back to the previous planet, branches are beacons, and HEAD is a ship circling its planet.
- **Three file zones** under the history — Working directory (amber), Staging area (blue) and Repository (violet) — as raised, tinted cards. When `git add`, `git commit` or unstaging moves a file, its card lifts off the surface, arcs across to the next zone and settles in with a ripple; several files cascade one after another. `git add` is shown as a copy (the flying card is tagged "copy", the file stays in the working directory marked "✓ staged", and the repository's version is marked "older" until you commit). Click the `git add` / `git commit` arrows for a one-line explanation.
- **Light dashboard by default** with a dark-mode toggle (sun/moon, top right). The choice is remembered and applied before the page paints.
- **Terminal**: a high-contrast dark console with a large command bar at the bottom that shows the current branch; autocomplete (Tab), ghost suggestions, history (↑↓), `&&` / `;` chains, `>` / `>>` redirects, typo suggestions, `--help` on every command, adjustable animation speed, `undo`.
- **Command Studio**: create your own commands (like git aliases) from steps with `$1`, `$2`, `$@` arguments, dry-run them against the current repo, and run them with step-by-step animation. Also a searchable reference of every built-in command.

Built-in commands: `git init, config, status, add (-f), commit (-a, --amend), rm, log, diff, show, branch (-d, -m, -r, -a), switch, checkout (incl. --ours/--theirs), tag, merge (fast-forward, three-way, conflicts, --abort), restore (incl. --ours/--theirs), reset (--soft/--mixed/--hard), revert, reflog, stash (push/list/pop/apply/drop), cherry-pick, rebase, remote, clone, fetch, pull, push (-u), help` plus shell helpers `ls, cat, touch, echo, edit, rm, clear, help, undo` and the simulator's `server` command, which plays GitHub and your teammates (`server create <url>`, `server commit <url> "message"`). `.gitignore` files are respected.

## Documentation

The [documentation/](documentation/) folder has the content reference: [adding-content.md](documentation/adding-content.md) (how to insert a question anywhere in a topic, or add a whole topic), [curriculum.md](documentation/curriculum.md) (every unit and level, generated from the level definitions), [learning-order.md](documentation/learning-order.md) (why the topics are in this order) and [coverage.md](documentation/coverage.md) (which Git topics are covered, which are supported but unused, and which aren't simulated).

## Architecture

```
src/
  engine/            Pure TypeScript Git simulator — no React, fully unit-tested
    core/            Repository model, revisions (HEAD~2, a1b2c3d, HEAD@{1}), graph queries, diff3 line merge
    parser/          Command-line tokenizer (quotes, &&, ;, >) and option parser (-am "msg", --long=value)
    commands/        One module per command + registry; shared helpers (guards, worktree, formatting)
    runtime/         Executor (input → animation frames), custom-command expansion, autocomplete
  content/           Topics and questions (topics/*.ts), content registry (registry.ts), goal builders, sandbox presets
  store/             Zustand stores: game session/playback, progress (persisted), custom commands (persisted)
  components/
    visualizer/      History board shell, file zones with flight animations, goal-preview trays
      linked-list/   Pointer/arrow layout (full size and mini), shared commit/pill styles, mini diagram
      scene/         Camera viewport, ListScene (choreography) and skins: linked list, railway, space
    terminal/        Terminal UI
    game/            Game screen, mission & sandbox panels, level-complete dialog
    studio/          Command Studio (custom commands + reference)
    home/            The level map (home page)
```

**Adding a view:** write a `SceneSkin` in `src/components/visualizer/scene/skins/` — metrics, a backdrop, and how to draw a link, a commit and a pointer — then register it in `SKINS` (`scene/index.tsx`) and add a button in `theme-switch.tsx`. `ListScene` handles layout, the camera and every animation.

**How a command animates:** the engine clones the repository state, runs the command against the draft, and returns a list of **frames** (state snapshot, terminal output, semantic events like `commit` / `fast-forward` / `merge-conflict`, and a plain-English narration). Commands can call `ctx.checkpoint()` to emit intermediate frames — for example, `commit -a` stages first and then commits, and `rebase` replays one commit per frame. The game store plays frames on a timer, and the visualizer animates the difference between consecutive states. A failed command discards its draft, so every command is atomic.

## Adding a built-in command

1. Create a module in `src/engine/commands/git/` (or `shell/`):

   ```ts
   import { defineCommand, type CommandContext } from "../types";

   export const whoamiCommand = defineCommand({
     program: "git",
     name: "whoami",
     category: "setup",
     summary: "Show who your commits are attributed to",
     usage: ["git whoami"],
     requiresRepo: false,
     run(ctx: CommandContext) {
       ctx.print(ctx.state.config["user.name"] ?? "You", "success");
       ctx.narrate({ icon: "🪪", title: "That's you", body: "Git stamps this name on every commit." });
     },
   });
   ```

2. Add it to `builtinCommands` in `src/engine/commands/index.ts`.

Help, `--help`, autocomplete, typo suggestions and the Command Studio reference pick it up automatically. Mutate `ctx.state`, call `ctx.fail(message, hint)` for errors, `ctx.emit(event)` for animations, and add a test in `src/engine/engine.test.ts`.

## Adding a question or a topic

Full guide: **[documentation/adding-content.md](documentation/adding-content.md)**. In short:

- **A question** is one object in a topic's `levels` list in `src/content/topics/*.ts`. Paste it at the position you want — first, third, last — or place it with `inserts: [{ item: level, place: { after: "some-id" } }]` without touching the list.
- **A topic** is a module in `src/content/topics/` listed in `src/content/topics/index.ts`, again at any position (or via `topicInserts`).
- **Nothing is renumbered by hand.** `src/content/registry.ts` derives level numbers, each topic's "n of m", next/previous and the unlock chain from list order, and refuses content with clashing or malformed ids. Progress is keyed by level id, so inserting questions never loses anyone's stars.
- `setup` builds the starting repository, `goals` come from `goals.*` in `src/content/goals.ts` (state checks, so any route that reaches the state passes), `hints` run nudge → answer, and `solution` is one correct route — `{{rev:HEAD~2}}` in it becomes a real commit id. The state-changing commands in `solution` become the star "par".
- `npm test` then checks the lot: every question starts unsolved, is solved by its own solution, is git-only, is judged by state, and fits on screen. `npm run docs` regenerates `documentation/curriculum.md`.

## Simplifications vs. real Git

The simulator is designed for learning, so some things are simplified: GitHub is simulated in memory (`server …` sets it up) and `git clone` downloads into the current, empty folder; file contents are plain text; `git commit` needs `-m` (there's no editor); rebase, cherry-pick, revert and stash stop on conflicts instead of pausing; and `edit`, `undo` and `server` are simulator helpers, not Git commands.
