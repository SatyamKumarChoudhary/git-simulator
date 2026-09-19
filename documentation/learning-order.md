# Why the topics are in this order

## The shape of every unit

Each unit repeats the same three-step rhythm, which is what the `phase` field on a level records:

1. **Learn** — one new idea, one command, the shortest possible task. Nothing else is new, so all the attention goes on the new thing.
2. **Practice** — the same idea in a different situation, a level or two later. The wording changes, the story changes, so you have to recall the idea rather than copy the last answer.
3. **Checkpoint** — one level at the end of the unit that mixes several earlier ideas and needs at least three commands. Its hints describe the steps but don't hand over the commands, so it works as a self-test.

Two supporting rules:

- **One new idea per level.** A level never introduces two commands at once. Where a task needs an earlier command as well, that command has already been taught and practised.
- **Nothing to type but git.** Any file change a level needs is already made in its setup, so a level never mixes "learn Git" with "learn a text editor". Merge conflicts are resolved by choosing a side (`git checkout --ours` / `--theirs`).

## Why the units come in this order

The order follows the way the topics were grouped by hand on paper — **local basics → remote repository → branches → rollback** — with the extra topics slotted in where they depend on what came before.

1. **Git basics (local)** — `git --version`, `init`, `status`, `add` (one file, several, `.`), `commit -m`, `config user.name/email`, `log --oneline`, `show`. Everything else is built on "a commit is a snapshot you chose to keep", so this is first and gets ten levels, ending with a from-scratch checkpoint.
2. **Everyday work** — the stage → commit loop, `commit -am`, `git diff`, focused commits, `.gitignore`, `git rm`, `git mv`. Still local, still only unit 1's ideas, but now it's the routine you'll repeat daily.
3. **Remote repository** — `clone`, `push`, `fetch`, `pull`, `remote add origin`, `branch -M main`, `push -u`. It comes before branches on purpose: getting your own work onto GitHub only needs commits, and it's the first thing most people actually need. Nothing here requires branching.
4. **Branches** — create, switch, commit on a branch, rename (`-m`), copy (`-c`), diverging history, `switch -c`, detached HEAD. Branches are only meaningful once commits are familiar, and they must come before merging.
5. **Merging** — fast-forward, merge commits, direction ("you merge into the branch you're on"), deleting merged branches, conflicts from both sides, `merge --abort`.
6. **Rollback** — the three places work can sit (working directory, staging area, committed history) and how to step back from each: `restore` / `checkout <file>`, `restore --staged` / `reset HEAD`, `diff` and `diff --cached` to see what you'd lose, `diff <old>..<new>`, `--amend`, `reset --soft`, `reset --hard`, `revert`, `reflog`. Deliberately after merging: by now there's something worth breaking, and the unit runs gentlest → scariest.
7. **Tags & stash** — naming a release, tagging the past, fixing a wrong tag, parking unfinished work. Small conveniences that need commits and branches but nothing later.
8. **Rewrite history** — cherry-pick, rebase, squash. The hardest local topic; it leans on commits, branches, merging and reset (squash is taught as `reset --soft` + one commit, which is why reset must come first).
9. **Working with a team** — remote branches, publishing a branch with `-u`, pushing again the short way, rejected pushes, a full team round trip. Last, because it needs both branches (unit 4) and remotes (unit 3).

## Difficulty ramp

- **Par** (the number of state-changing commands in the reference solution) rises from 1 in early levels to 3–5 in the later checkpoints.
- **XP** rises with it (20 → 95), so the map shows the climb.
- **Hints** stay graded everywhere: the first hint nudges, the last one gives the command. Nothing is revealed until you press **?**.
- **Checkpoints** are the only levels that expect you to plan several steps yourself.

## How levels are judged

A level checks **the state of the repository you end up in**, not the commands you typed. If two commands reach the same place, both are correct:

- `git switch main` or `git checkout main`
- `git switch -c hotfix` or `git branch hotfix` then `git switch hotfix` (or `git checkout -b hotfix`)
- `git add a.txt b.txt` or two separate `git add` commands, or `git add .`
- `git commit -am "…"` or `git add` then `git commit -m "…"` (and `--message` for `-m`)
- `git pull` or `git fetch` then `git merge origin/main`
- `git restore --staged secrets.txt`, `git reset HEAD secrets.txt` or `git rm --cached secrets.txt`
- `git checkout --theirs file` or `git restore --theirs file`
- `HEAD~1` or `HEAD^`, `HEAD~2` or `HEAD^^`, a commit id or a position like `design~1`
- `git branch -d` or `-D`, `git tag -d` or `--delete`, `git push -u` or `--set-upstream`
- `git stash` or `git stash push`; `git stash pop` or `git stash apply` + `git stash drop`

- `git init .` or plain `git init`; `git add index.*` or the full file name
- `git rm old.txt` or deleting the file and staging that deletion
- `git merge --abort` or `git reset --hard HEAD`; `git reset --hard HEAD@{1}` or merging the lost commit
- `git clone <url>` or `git init` + `git remote add origin <url>` + `git pull origin main`

Two tests keep this honest:

- `src/content/alternatives.test.ts` walks a **different** route through every one of the levels and requires the goals to pass.
- `src/content/content.test.ts` re-checks each goal with the list of typed commands emptied. If forgetting what was typed changes the answer, the goal is judging the route — and only the inspection levels below are allowed to do that.

The only levels that ask for a specific command are the ones where nothing in the repository changes — "run `git status`", "run `git log`", "run `git diff --staged`" — because looking *is* the task. Even those accept the variants (`git status -s`, `git log --oneline`, `git diff --cached`, `git branch -a` for `-r`, `git show <id>` by id or position).
