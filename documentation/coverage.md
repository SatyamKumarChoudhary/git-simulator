# Topic coverage

What the 74 levels teach, what the simulator can already do but no level uses yet, and what isn't simulated at all.

## Covered by levels

| Topic | Commands | Unit |
| --- | --- | --- |
| Making a repository | `git init` | 1 |
| Seeing the state of things | `git status` | 1 |
| Staging: one file, several files, everything | `git add <file>`, `git add a b`, `git add .` | 1 |
| Committing | `git commit -m` | 1 |
| Who made a commit | `git config user.name` / `user.email` | 1 |
| The everyday loop | `git add` → `git commit` | 1, 2 |
| Staging and committing in one step | `git commit -am` | 2 |
| Seeing changes, unstaged and staged | `git diff`, `git diff --staged` | 2 |
| Reading history and opening a commit | `git log --oneline`, `git show <id>` | 2 |
| Focused, one-idea commits | `git add <file>` then commit, twice | 2 |
| Ignoring files | `.gitignore` (respected by `git add .`) | 2 |
| Deleting a tracked file | `git rm` | 2 |
| Renaming a tracked file | `git mv` | 2 |
| Branches: create, switch, rename, copy | `git branch`, `git switch`, `git branch -m` / `-M`, `git branch -c`, `git switch -c` | 4 |
| Committing on a branch, diverging history | `git commit` on a branch, two branches moving apart | 3 |
| Uncommitted changes travel with you | `git switch` with a dirty working tree | 3 |
| Visiting an old commit (detached HEAD) | `git checkout HEAD~2`, `git switch main` | 3 |
| Fast-forward merge | `git merge` | 4 |
| Merge commits (three-way) | `git merge` | 4 |
| Merge direction | `git switch main` then `git merge <branch>` | 4 |
| Deleting a merged branch | `git branch -d` | 4 |
| Merge conflicts, both sides | `git checkout --theirs <file>`, `git checkout --ours <file>`, `git add`, `git commit` | 4 |
| Backing out of a merge | `git merge --abort` | 4 |
| Throwing away edits | `git restore <file>`, `git restore .` | 5 |
| Unstaging one file, or everything | `git restore --staged <file>`, `git reset HEAD` | 6 |
| Fixing the last commit | `git commit --amend -m`, `git commit --amend --no-edit` | 5 |
| Moving a branch back | `git reset --soft`, `git reset --hard` | 5 |
| Undoing safely with a new commit | `git revert HEAD~1`, `git revert <id>` | 5 |
| Rescuing "lost" commits | `git reflog`, `git reset --hard HEAD@{1}` | 5 |
| Release tags, tagging the past, fixing a tag | `git tag`, `git tag <name> HEAD~2`, `git tag -d` | 6 |
| Parking unfinished work | `git stash`, `git stash pop`, `git stash list`, `git stash pop stash@{1}`, `git stash drop` | 6 |
| Copying one commit | `git cherry-pick <branch>~1`, `git cherry-pick <id>` | 7 |
| Replaying a branch on top of another | `git rebase main` | 7 |
| Rebase then hand over as a straight line | `git rebase` + fast-forward `git merge` | 7 |
| Squashing several commits into one | `git reset --soft HEAD~3` + `git commit` | 7 |
| Cloning, and what "origin" is | `git clone <url>` | 3 |
| Connecting an existing project to GitHub | `git remote add origin <url>`, `git push -u origin main` | 3 |
| Renaming the default branch to main | `git branch -M main` | 3 |
| Comparing two commits | `git diff <old>..<new>` | 6 |
| Checking the Git version | `git --version` | 1 |
| Sharing work | `git push` | 8 |
| Seeing a teammate's work before taking it | `git fetch`, `git merge origin/main` | 8 |
| Fetch + merge in one step | `git pull` | 8 |
| Remote-tracking branches, joining a branch | `git branch -r`, `git switch <remote branch>` | 8 |
| Rejected pushes | `git pull` then `git push` | 8 |
| Publishing a new branch and linking it | `git push -u origin <branch>` | 8 |

## Supported by the simulator, but no level uses it yet

These work if you type them (the sandbox and `--help` know them), so each is a cheap level to add:

| Command | Suggested level |
| --- | --- |
| `git restore --source <commit> <file>` | Bring one file back from an older commit without moving the branch. |
| `git merge --no-ff` | Keep a merge commit on purpose, to show the shape difference. |
| `git switch --detach <commit>` | The modern alternative to `git checkout <commit>`. |
| `git log --all`, `git log -n`, `git log <branch>` | Reading a branchy history (pairs well with unit 3). |
| `git stash apply`, `git stash push -m "..."` | Apply without dropping; name a stash. |
| `git add -f` | Stage an ignored file on purpose. |
| `git cherry-pick <a> <b>` | Copy two commits in one command. |
| `git checkout -b` | The classic branch-and-switch, as a footnote to `switch -c`. |

(`git remote -v` and `git remote remove` are still untouched by any level, as is `git help`.)

## Not simulated (would need engine work first)

Grouped by what it would take. Nothing below is taught, and no level pretends it exists.

**History surgery**
`git rebase -i` (reword/drop/squash/reorder), `rebase --onto`, `rebase --continue/--abort`, conflict handling during rebase and cherry-pick (`--continue`, `-n`, `-x`), `git commit --fixup/--squash`, `git rerere`.

**Inspection and search**
`git blame`, `git bisect`, `git log --graph/-p/--author/--since/--follow`, `git shortlog`, `git describe`, `git grep`, `git diff --stat`, `git show --stat`.

**Partial staging**
`git add -p` / `git restore -p` (staging part of a file) — the simulator stages whole files only.

**Remotes and hosting, beyond the basics**
Pull requests, forks, reviews and merge buttons (GitHub's side of the workflow, not Git itself), `git push --force` / `--force-with-lease`, `git fetch --prune`, `git pull --rebase`, `git branch --set-upstream-to`, multiple remotes, authentication (SSH keys, tokens).

**Tags and releases, beyond lightweight tags**
Annotated and signed tags (`git tag -a/-s`), pushing tags (`git push --tags`), commit signing (`-S`).

**Bigger machinery**
Submodules, worktrees, hooks, `git clean`, `git mv`, `git archive`, `git notes`, sparse-checkout, Git LFS, `.gitattributes`, `git gc` / reflog expiry, `git config --global` / `--list` and config levels, merge strategies and `git merge --squash`, `git stash branch`, `git reset --keep/--merge`.

## Equivalent commands the levels accept

Because goals are state checks, the simulator deliberately supports both the old and new spellings side by side: `switch` / `checkout`, `restore` / `reset <file>` / `rm --cached`, `checkout --ours|--theirs` / `restore --ours|--theirs`, `-m` / `--message`, `-d` / `-D` / `--delete`, `-u` / `--set-upstream`, `--staged` / `--cached`, `~n` / `^`, `stash` / `stash push`, `stash pop` / `stash apply` + `drop`, `git diff <file>` as well as `git diff -- <file>`, and `git pull` into an empty repository as the long way round of `git clone`.

## Honest summary

Everything a person needs for day-to-day solo and small-team Git is covered end to end: making commits, inspecting them, branching, merging (including conflicts), undoing every kind of mistake, tagging, stashing, rewriting local history, and working with a remote.

The clearest gaps, in the order I'd close them:

1. **`git remote add`** — the only common "getting started with GitHub" path that's missing, and the engine already supports it.
2. **Interactive rebase** — the most-wanted rewrite tool; needs an engine feature (a rebase todo list) plus a UI for it.
3. **Partial staging (`add -p`)** — needs line-level staging in the engine, and a way to pick lines without a text editor.
4. **`blame` / `bisect`** — great teaching material, each needs a new command and a way to show its output.
5. **Pull-request flow** — would need the simulated GitHub to model branches, reviews and a merge button.
