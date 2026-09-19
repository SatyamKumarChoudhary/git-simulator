# Curriculum — every topic and question

> Generated from `src/content/worlds/*.ts`. Every level is solved with git commands only; any file change a level needs is already made in its setup.

**74 levels in 9 units**, in topic order: local basics → everyday work → remote repository → branches → merging → rollback → tags & stash → rewrite history → teamwork.

Levels are judged by the repository state you reach, so the solutions below are one route among several — see [learning-order.md](learning-order.md#how-levels-are-judged).

| # | Unit | Level | Kind | Teaches |
| --- | --- | --- | --- | --- |
| 1 | Git basics | Start tracking | Learn | Repository |
| 2 | Git basics | Ask Git what's going on | Learn | git status |
| 3 | Git basics | Stage one file | Learn | Staging area |
| 4 | Git basics | Stage two, skip one | Practice | Several files at once |
| 5 | Git basics | Your first commit | Learn | Commit |
| 6 | Git basics | Around the loop again | Practice | add → commit |
| 7 | Git basics | Save everything at once | Learn | git add . |
| 8 | Git basics | Sign your work | Learn | git config |
| 9 | Git basics | Read the history | Learn | git log |
| 10 | Git basics | Checkpoint: a repo from scratch | Checkpoint | The whole loop |
| 11 | Everyday work | The daily loop | Learn | The loop |
| 12 | Everyday work | Two steps in one | Practice | git commit -a |
| 13 | Everyday work | Spot the difference | Learn | git diff |
| 14 | Everyday work | One change, one commit | Practice | Small commits |
| 15 | Everyday work | Ignore the junk | Learn | .gitignore |
| 16 | Everyday work | Delete a file | Learn | git rm |
| 17 | Everyday work | Rename a file | Practice | git mv |
| 18 | Everyday work | Checkpoint: a tidy day's work | Checkpoint | Putting it together |
| 19 | Remote repository | Clone a project | Learn | Remote |
| 20 | Remote repository | Share your work | Learn | git push |
| 21 | Remote repository | See what your team did | Learn | git fetch |
| 22 | Remote repository | Pull in one step | Practice | git pull |
| 23 | Remote repository | Connect your project to GitHub | Learn | git remote add |
| 24 | Remote repository | Rename the default branch | Practice | git branch -M main |
| 25 | Remote repository | Checkpoint: publish a project | Checkpoint | Putting a project on GitHub |
| 26 | Branches | Make a branch | Learn | Branch |
| 27 | Branches | Hop onto the branch | Learn | git switch |
| 28 | Branches | Work on the side | Practice | Only your branch moves |
| 29 | Branches | Fix a branch name | Learn | git branch -m |
| 30 | Branches | Keep a safety copy | Practice | git branch -c |
| 31 | Branches | Two paths | Practice | Diverging history |
| 32 | Branches | Create and switch at once | Learn | git switch -c |
| 33 | Branches | Start a second idea | Practice | A branch per idea |
| 34 | Branches | Visit an old commit | Learn | Detached HEAD |
| 35 | Branches | Checkpoint: side by side | Checkpoint | Branch, commit, return |
| 36 | Merging | Fast-forward | Learn | Fast-forward merge |
| 37 | Merging | When paths meet | Learn | Merge commit |
| 38 | Merging | Merge from the right side | Practice | Direction matters |
| 39 | Merging | Tidy up | Learn | Deleting branches |
| 40 | Merging | Fix a merge conflict | Learn | Merge conflict |
| 41 | Merging | Keep your own version | Practice | --ours vs --theirs |
| 42 | Merging | Back out of a merge | Learn | git merge --abort |
| 43 | Merging | Checkpoint: finish a feature | Checkpoint | Merge, then tidy |
| 44 | Rollback | Throw away an edit | Learn | git restore |
| 45 | Rollback | Throw away every edit | Practice | git restore . |
| 46 | Rollback | Oops, unstage that | Learn | Unstaging |
| 47 | Rollback | Check before you commit | Practice | git diff --staged |
| 48 | Rollback | Unstage everything | Practice | git reset HEAD |
| 49 | Rollback | Compare two commits | Practice | git diff <old>..<new> |
| 50 | Rollback | Fix a commit message | Learn | git commit --amend |
| 51 | Rollback | Forgot a file | Practice | Amend with files |
| 52 | Rollback | Undo a commit, keep the work | Learn | git reset --soft |
| 53 | Rollback | Rewind completely | Learn | git reset --hard |
| 54 | Rollback | Undo without rewriting | Learn | git revert |
| 55 | Rollback | Undo something older | Practice | Reverting by id |
| 56 | Rollback | Rescue lost work | Learn | git reflog |
| 57 | Rollback | Checkpoint: clean up the mess | Checkpoint | Choosing the right undo |
| 58 | Tags & stash | Tag a release | Learn | Tags |
| 59 | Tags & stash | Tag the past | Practice | HEAD~N |
| 60 | Tags & stash | Move a tag you got wrong | Practice | git tag -d |
| 61 | Tags & stash | Stash it away | Learn | git stash |
| 62 | Tags & stash | Pick the right stash | Practice | The stash is a stack |
| 63 | Tags & stash | Checkpoint: release day | Checkpoint | Park, look, resume |
| 64 | Rewrite history | Cherry-pick a commit | Learn | git cherry-pick |
| 65 | Rewrite history | Cherry-pick by id | Practice | Commits have names |
| 66 | Rewrite history | Straighten the line | Learn | git rebase |
| 67 | Rewrite history | Rebase, then hand it over | Practice | Rebase then fast-forward |
| 68 | Rewrite history | Squash commits | Learn | Squashing |
| 69 | Rewrite history | Checkpoint: tidy before sharing | Checkpoint | The tidy-up routine |
| 70 | Working with a team | Join a teammate's branch | Learn | Remote-tracking branches |
| 71 | Working with a team | Publish a branch | Learn | git push -u |
| 72 | Working with a team | Push again, the short way | Practice | Why -u was worth it |
| 73 | Working with a team | Push rejected! | Learn | Rejected push |
| 74 | Working with a team | Checkpoint: a day with the team | Checkpoint | The team round trip |

## Unit 1 — 🌱 Git basics

_Your first repository, your first commits, and reading history_ · 10 levels

### 1. Start tracking  

- **Kind:** Learn · **id:** `start-tracking` · **XP:** 20 · **Par:** 1 command
- **Teaches:** Repository — A repository is a project folder that Git watches. git init gives the folder a memory (a hidden .git folder) so Git can start saving snapshots.
- **Question:** You're building a tiny website. The folder has two files, but nothing is remembering your work yet. Turn this folder into a Git repository.
- **Goals (checked as state, not as commands):** Turn the folder into a Git repository
- **One solution:** `git init`

### 2. Ask Git what's going on  

- **Kind:** Learn · **id:** `ask-git` · **XP:** 20 · **Par:** 0 commands
- **Teaches:** git status — git status is your best friend. It tells you which files changed, which are ready to be saved, and which Git isn't tracking yet.
- **Question:** Git is watching the folder now. Ask Git what it sees — which files are new and not saved yet?
- **Goals (checked as state, not as commands):** Check the status (git status)
- **One solution:** `git status`

### 3. Stage one file  

- **Kind:** Learn · **id:** `stage-fright` · **XP:** 30 · **Par:** 1 command
- **Teaches:** Staging area — Git doesn't save everything automatically. You choose what goes into the next snapshot by staging it with git add — like packing a box before you seal it.
- **Question:** Your homepage is ready, but the stylesheet is still an experiment. Put only index.html into the staging area, so it will be part of the next save.
- **Goals (checked as state, not as commands):** Stage index.html · Leave style.css unstaged
- **One solution:** `git add index.html`

### 4. Stage two, skip one  

- **Kind:** Practice · **id:** `stage-two` · **XP:** 30 · **Par:** 1 command
- **Teaches:** Several files at once — git add takes as many file names as you like: git add one.txt two.txt. Only what you stage ends up in the next commit.
- **Question:** The site now has a notes file you don't want in the project. Stage index.html and style.css — both in one command — and leave notes.txt alone.
- **Goals (checked as state, not as commands):** Stage index.html · Stage style.css · Leave notes.txt out
- **One solution:** `git add index.html style.css`

### 5. Your first commit  

- **Kind:** Learn · **id:** `first-commit` · **XP:** 30 · **Par:** 1 command
- **Teaches:** Commit — A commit is a saved snapshot of everything in the staging area, plus a message. It becomes permanent history you can always come back to.
- **Question:** index.html is staged and waiting. Save it as your very first commit, with a short message that says what you did.
- **Goals (checked as state, not as commands):** Make your first commit · index.html is saved in it
- **One solution:** `git commit -m "Add homepage"`

### 6. Around the loop again  

- **Kind:** Practice · **id:** `commit-again` · **XP:** 35 · **Par:** 2 commands
- **Teaches:** add → commit — Every save is the same two steps: git add what you want to keep, then git commit to store it. You'll do this hundreds of times.
- **Question:** The homepage is saved, but style.css still isn't. Do the same two steps again for it: stage it, then commit it.
- **Goals (checked as state, not as commands):** Commit style.css on its own · Exactly 2 commits now · Nothing is left unsaved
- **One solution:** `git add style.css` → `git commit -m "Add styles"`

### 7. Save everything at once  

- **Kind:** Learn · **id:** `save-everything` · **XP:** 35 · **Par:** 2 commands
- **Teaches:** git add . — The dot means "everything in this folder". git add . stages all new and changed files at once.
- **Question:** style.css and a new about.html are still unsaved. Stage every file in one go and commit them, so nothing is left behind.
- **Goals (checked as state, not as commands):** style.css is committed · about.html is committed · Nothing is left unsaved
- **One solution:** `git add .` → `git commit -m "Add styles and about page"`

### 8. Sign your work  

- **Kind:** Learn · **id:** `sign-your-work` · **XP:** 35 · **Par:** 3 commands
- **Teaches:** git config — git config user.name and user.email set the name stamped on your commits, so your team knows who changed what.
- **Question:** Every commit records who made it. Tell Git your name and email, then commit the README change that is already staged.
- **Goals (checked as state, not as commands):** Set your name · Set your email · Commit the change under your name
- **One solution:** `git config user.name "Ada"` → `git config user.email "ada@example.com"` → `git commit -m "Update readme"`

### 9. Read the history  

- **Kind:** Learn · **id:** `read-history` · **XP:** 40 · **Par:** 0 commands
- **Teaches:** git log — git log lists commits from newest to oldest. Every commit has a unique id — its first seven characters are enough to name it. git show <id> opens one.
- **Question:** This project already has three commits. Use the history to find the very first one, then open that commit to see what it contained.
- **Goals (checked as state, not as commands):** Read the history (git log) · Open the very first commit (git show <id>)
- **One solution:** `git log --oneline` → `git show 01031d6`

### 10. Checkpoint: a repo from scratch  

- **Kind:** Checkpoint · **id:** `checkpoint-first-repo` · **XP:** 50 · **Par:** 3 commands
- **Teaches:** The whole loop — init once per project, then add and commit as often as you like. Those three commands cover most days of Git.
- **Question:** A brand-new recipe site: two files, no Git yet. Do the whole journey yourself — make it a repository, stage both files and save them in one commit. No hints needed, you've done every step.
- **Goals (checked as state, not as commands):** Make it a repository · Make one commit · index.html is in it · …and so is style.css · Nothing is left unsaved
- **One solution:** `git init` → `git add .` → `git commit -m "First version"`


## Unit 2 — 🔁 Everyday work

_Stage, commit, repeat — the loop you'll use every day_ · 8 levels

### 11. The daily loop  

- **Kind:** Learn · **id:** `daily-loop` · **XP:** 35 · **Par:** 2 commands
- **Teaches:** The loop — Working with Git is a simple loop: you change files, git add the changes, then git commit them. Then do it again.
- **Question:** You just made the headings purple in style.css — it's already changed in your Working directory. Stage that change and commit it. Stage → commit is the loop you'll repeat all day.
- **Goals (checked as state, not as commands):** Stage the change to style.css · Commit it · Nothing is left unsaved
- **One solution:** `git add style.css` → `git commit -m "Purple headings"`

### 12. Two steps in one  

- **Kind:** Practice · **id:** `commit-am` · **XP:** 35 · **Par:** 1 command
- **Teaches:** git commit -a — -a stages every file Git already tracks, then commits. Handy for quick edits — but it never picks up brand-new files, so git add is still needed for those.
- **Question:** index.html has a new welcome line. Since Git already tracks that file, you can stage and commit it with a single command.
- **Goals (checked as state, not as commands):** Commit the change to index.html · Nothing is left unsaved
- **One solution:** `git commit -am "Add welcome line"`

### 13. Spot the difference  

- **Kind:** Learn · **id:** `spot-the-difference` · **XP:** 35 · **Par:** 1 command
- **Teaches:** git diff — git diff shows, line by line, what changed but isn't staged yet. Lines starting with + were added, lines with - were removed.
- **Question:** Someone changed style.css and you're not sure what they did. Look at the exact changes, then commit them.
- **Goals (checked as state, not as commands):** See the changes (git diff) · Commit the change · Nothing is left unsaved
- **One solution:** `git diff` → `git commit -am "Teal headings"`

### 14. One change, one commit  

- **Kind:** Practice · **id:** `one-change-one-commit` · **XP:** 40 · **Par:** 4 commands
- **Teaches:** Small commits — Focused commits keep history easy to read and easy to undo. Stage only the files for one change, commit, then do the next one.
- **Question:** You changed style.css and also started a new about.html page. Save them as two separate commits — one for each change.
- **Goals (checked as state, not as commands):** Commit style.css on its own · Commit about.html on its own · Nothing is left unsaved
- **One solution:** `git add style.css` → `git commit -m "Update colours"` → `git add about.html` → `git commit -m "Add about page"`

### 15. Ignore the junk  

- **Kind:** Learn · **id:** `ignore-junk` · **XP:** 45 · **Par:** 2 commands
- **Teaches:** .gitignore — A .gitignore file lists files Git should pretend don't exist — logs, secrets, build output. Ignored files never show up as new files to add.
- **Question:** Your app writes a debug.log file that should never be saved, so there's already a .gitignore file that lists it. Stage everything and commit — and watch debug.log stay out.
- **Goals (checked as state, not as commands):** Commit app.js · Commit the .gitignore file too · debug.log stays out of the commit
- **One solution:** `git add .` → `git commit -m "Add app"`

### 16. Delete a file  

- **Kind:** Learn · **id:** `delete-a-file` · **XP:** 40 · **Par:** 2 commands
- **Teaches:** git rm — git rm deletes a file and stages the deletion in one step. The next commit records that the file is gone.
- **Question:** old-page.html isn't needed any more. Remove it from the project and commit the deletion.
- **Goals (checked as state, not as commands):** old-page.html is gone from the latest commit · …and from the folder · Nothing is left unsaved
- **One solution:** `git rm old-page.html` → `git commit -m "Remove old page"`

### 17. Rename a file  

- **Kind:** Practice · **id:** `rename-a-file` · **XP:** 45 · **Par:** 2 commands
- **Teaches:** git mv — git mv does two things at once: it renames the file on disk and stages the rename. Renaming by hand would look to Git like one file deleted and another added.
- **Question:** The homepage should be called home.html, not index.html. Rename it so Git records the rename, then commit.
- **Goals (checked as state, not as commands):** home.html is committed · index.html is gone · Nothing is left unsaved
- **One solution:** `git mv index.html home.html` → `git commit -m "Rename homepage"`

### 18. Checkpoint: a tidy day's work  

- **Kind:** Checkpoint · **id:** `checkpoint-everyday` · **XP:** 55 · **Par:** 4 commands
- **Teaches:** Putting it together — Look at what changed, stage one idea at a time, commit it, repeat. Ignored files stay out of your way the whole time.
- **Question:** A normal day: the stylesheet changed, there's a new pricing page, and your app left a debug.log behind (already ignored). Save the two real changes as two separate commits and finish with nothing unsaved.
- **Goals (checked as state, not as commands):** One commit for the stylesheet · Another for the pricing page · debug.log is never committed · Nothing is left unsaved
- **One solution:** `git add style.css` → `git commit -m "Navy headings"` → `git add pricing.html` → `git commit -m "Add pricing page"`


## Unit 3 — ☁️ Remote repository

_Put your project on GitHub and keep it in sync_ · 7 levels

### 19. Clone a project  

- **Kind:** Learn · **id:** `clone` · **XP:** 60 · **Par:** 1 command
- **Teaches:** Remote — A remote is a copy of the repository on a server like GitHub. git clone downloads it and remembers where it came from as 'origin'.
- **Question:** Your team's website lives on GitHub at https://github.com/team/website. Download a full copy, with all its history, into this empty folder.
- **Goals (checked as state, not as commands):** Clone the repository · You have the team's commits
- **One solution:** `git clone https://github.com/team/website`

### 20. Share your work  

- **Kind:** Learn · **id:** `push` · **XP:** 65 · **Par:** 3 commands
- **Teaches:** git push — git push uploads your new commits to the remote. origin/main moves too, showing what GitHub now has.
- **Question:** You created an About page. Commit it, then push it to GitHub so your team can see it.
- **Goals (checked as state, not as commands):** Commit about.html · GitHub has about.html
- **One solution:** `git add .` → `git commit -m "Add about page"` → `git push`

### 21. See what your team did  

- **Kind:** Learn · **id:** `fetch` · **XP:** 65 · **Par:** 2 commands
- **Teaches:** git fetch — fetch downloads new commits and moves origin/main — but leaves your own branches alone, so you can look before you merge.
- **Question:** A teammate pushed a commit to GitHub. Fetch it first (watch origin/main move while your main stays put), then merge it into main.
- **Goals (checked as state, not as commands):** Fetch the new commit · Merge it into main
- **One solution:** `git fetch` → `git merge origin/main`

### 22. Pull in one step  

- **Kind:** Practice · **id:** `pull` · **XP:** 65 · **Par:** 1 command
- **Teaches:** git pull — git pull is fetch and merge in one go: it downloads new commits and merges them into your current branch.
- **Question:** Two more commits landed on GitHub. This time get them into your main with a single command.
- **Goals (checked as state, not as commands):** main has the new commits · Nothing is left unsaved
- **One solution:** `git pull`

### 23. Connect your project to GitHub  

- **Kind:** Learn · **id:** `connect-remote` · **XP:** 70 · **Par:** 2 commands
- **Teaches:** git remote add — git remote add origin <url> tells your repository where its home on GitHub is. 'origin' is just the usual nickname for that address. The first push also links your branch to it with -u.
- **Question:** Your shop only exists on this computer. An empty repository is waiting at https://github.com/team/shop. Add it as the remote called origin, then push main so the code is finally online.
- **Goals (checked as state, not as commands):** Add origin · GitHub has your main branch · main is linked to origin/main
- **One solution:** `git remote add origin https://github.com/team/shop` → `git push -u origin main`

### 24. Rename the default branch  

- **Kind:** Practice · **id:** `default-branch` · **XP:** 70 · **Par:** 2 commands
- **Teaches:** git branch -M main — -M renames a branch even if the new name is taken. Older repositories start on 'master'; most teams now use 'main', so this rename is the first thing you do.
- **Question:** This old project still calls its default branch master, and the team uses main. Rename it to main, then push it to GitHub and link it.
- **Goals (checked as state, not as commands):** You're on a branch called main · There's no master branch any more · GitHub has main
- **One solution:** `git branch -M main` → `git push -u origin main`

### 25. Checkpoint: publish a project  

- **Kind:** Checkpoint · **id:** `checkpoint-remote` · **XP:** 85 · **Par:** 3 commands
- **Teaches:** Putting a project on GitHub — Three steps, once per project: rename the branch to main, add the remote, then push with -u. After that, plain git push and git pull are enough.
- **Question:** An old project on your laptop: branch still called master, no remote, and an empty repository waiting at https://github.com/team/shop. Get it online the way the team expects — branch named main, connected to origin, pushed and linked.
- **Goals (checked as state, not as commands):** The branch is called main · origin points at the GitHub repo · GitHub has all your commits · main is linked to origin/main
- **One solution:** `git branch -M main` → `git remote add origin https://github.com/team/shop` → `git push -u origin main`


## Unit 4 — 🌿 Branches

_Work on ideas side by side_ · 10 levels

### 26. Make a branch  

- **Kind:** Learn · **id:** `make-a-branch` · **XP:** 40 · **Par:** 1 command
- **Teaches:** Branch — A branch is a label pointing at a commit. Making one is instant and copies nothing. HEAD shows which branch you're on.
- **Question:** You want to try a dark-mode redesign without touching the live site. Create a branch called dark-mode. Notice that creating it doesn't move you onto it.
- **Goals (checked as state, not as commands):** Create the dark-mode branch · You're still on main
- **One solution:** `git branch dark-mode`

### 27. Hop onto the branch  

- **Kind:** Learn · **id:** `switch-branches` · **XP:** 40 · **Par:** 1 command
- **Teaches:** git switch — git switch moves HEAD to another branch. Your files change to match that branch's latest commit.
- **Question:** The dark-mode branch exists. Switch to it, so your next commits go there instead of main.
- **Goals (checked as state, not as commands):** Be on dark-mode (HEAD → dark-mode)
- **One solution:** `git switch dark-mode`

### 28. Work on the side  

- **Kind:** Practice · **id:** `commit-on-branch` · **XP:** 45 · **Par:** 1 command
- **Teaches:** Only your branch moves — When you commit, only the branch HEAD points at moves to the new commit. Every other branch stays exactly where it was.
- **Question:** You're on dark-mode, and you've already made the site dark in style.css. Commit that change. Watch: only dark-mode moves forward — main stays put.
- **Goals (checked as state, not as commands):** Commit on dark-mode · main hasn't moved
- **One solution:** `git commit -am "Dark theme"`

### 29. Fix a branch name  

- **Kind:** Learn · **id:** `rename-branch` · **XP:** 45 · **Par:** 1 command
- **Teaches:** git branch -m — -m (move) renames a branch. The commits don't care about names, so nothing else changes. git branch on its own lists what you have.
- **Question:** You created the branch but typed it wrong: 'dark-mdoe'. Rename it to dark-mode — no need to switch anywhere.
- **Goals (checked as state, not as commands):** There's a dark-mode branch · The misspelled branch is gone
- **One solution:** `git branch -m dark-mdoe dark-mode`

### 30. Keep a safety copy  

- **Kind:** Practice · **id:** `copy-branch` · **XP:** 45 · **Par:** 1 command
- **Teaches:** git branch -c — git branch -c <name> copies the branch you're on, history and all, under a new name. Branches are just labels, so a safety copy costs nothing.
- **Question:** You're about to try something risky on dark-mode. First make a branch called dark-mode-backup that points at the same commit, so you can always come back — and stay on dark-mode.
- **Goals (checked as state, not as commands):** Create dark-mode-backup · It points at the same commit as dark-mode · You're still on dark-mode
- **One solution:** `git branch -c dark-mode-backup`

### 31. Two paths  

- **Kind:** Practice · **id:** `two-paths` · **XP:** 45 · **Par:** 2 commands
- **Teaches:** Diverging history — Commit on two different branches and history forks: both share an older commit, then grow separately.
- **Question:** A typo was reported on the live site, and you've already fixed it in index.html — but you're still on dark-mode. Switch to main (uncommitted changes come with you) and commit the fix there. History splits into two paths!
- **Goals (checked as state, not as commands):** Commit the fix on main · History splits into two paths
- **One solution:** `git switch main` → `git commit -am "Fix typo"`

### 32. Create and switch at once  

- **Kind:** Learn · **id:** `create-and-switch` · **XP:** 45 · **Par:** 1 command
- **Teaches:** git switch -c — -c creates a new branch where you are and switches to it straight away. It's the everyday way to start new work.
- **Question:** Urgent bug! Create a branch called hotfix and switch to it — using just one command.
- **Goals (checked as state, not as commands):** Be on a new hotfix branch
- **One solution:** `git switch -c hotfix`

### 33. Start a second idea  

- **Kind:** Practice · **id:** `start-a-feature` · **XP:** 50 · **Par:** 3 commands
- **Teaches:** A branch per idea — Branches are cheap, so start one for every idea. main keeps working while your idea grows on the side.
- **Question:** A search box is your next idea, and search.js is already written but unsaved. Start a branch called search in one command, commit the file there, and leave main untouched.
- **Goals (checked as state, not as commands):** Be on a new search branch · search.js is committed there · main hasn't moved
- **One solution:** `git switch -c search` → `git add search.js` → `git commit -m "Add search box"`

### 34. Visit an old commit  

- **Kind:** Learn · **id:** `detached-head` · **XP:** 55 · **Par:** 2 commands
- **Teaches:** Detached HEAD — You can point HEAD straight at an old commit to look around. That's called detached HEAD. Switch back to a branch before doing real work.
- **Question:** Your boss wants to see the very first version of the site. Jump back to that first commit — watch the files in your Working directory change — then come back to main.
- **Goals (checked as state, not as commands):** Visit the 'First version' commit · Come back to main
- **One solution:** `git checkout HEAD~2` → `git switch main`

### 35. Checkpoint: side by side  

- **Kind:** Checkpoint · **id:** `checkpoint-branches` · **XP:** 60 · **Par:** 4 commands
- **Teaches:** Branch, commit, return — This is the everyday branch rhythm: start a branch for the idea, commit on it, and switch back to main when you're done.
- **Question:** A summer promo banner is written in promo.html but not saved. Keep main clean: put the banner on its own branch called promo, commit it there, then go back to main and leave it exactly as it was.
- **Goals (checked as state, not as commands):** Create the promo branch · The banner is committed on promo · main is exactly as before · You end up back on main
- **One solution:** `git switch -c promo` → `git add promo.html` → `git commit -m "Add promo banner"` → `git switch main`


## Unit 5 — 🔀 Merging

_Bring branches back together_ · 8 levels

### 36. Fast-forward  

- **Kind:** Learn · **id:** `fast-forward` · **XP:** 50 · **Par:** 2 commands
- **Teaches:** Fast-forward merge — If main has no new commits of its own, Git simply slides the main label forward to the newest commit. No extra commit needed.
- **Question:** The dark-mode branch is finished and main hasn't changed since. Bring dark-mode's work into main. Remember: you merge INTO the branch you're on.
- **Goals (checked as state, not as commands):** Be on main · main has dark-mode's commits · No merge commit was needed
- **One solution:** `git switch main` → `git merge dark-mode`

### 37. When paths meet  

- **Kind:** Learn · **id:** `paths-meet` · **XP:** 55 · **Par:** 1 command
- **Teaches:** Merge commit — When both branches moved on, Git combines their changes into a merge commit — a commit with two parents that ties the paths together.
- **Question:** You built a contact page on the contact branch while a teammate added analytics on main. Both have new commits. Merge contact into main.
- **Goals (checked as state, not as commands):** Create a merge commit on main · main has contact.html · …and still has analytics.js
- **One solution:** `git merge contact`

### 38. Merge from the right side  

- **Kind:** Practice · **id:** `merge-from-main` · **XP:** 55 · **Par:** 2 commands
- **Teaches:** Direction matters — git merge brings the named branch INTO the branch you're on. To update main, switch to main first and merge the other branch.
- **Question:** The pricing branch is done, and main has moved on too. You're standing on pricing — get its work into main, not the other way round.
- **Goals (checked as state, not as commands):** End up on main · main has a merge commit · main has the pricing page · pricing itself didn't move
- **One solution:** `git switch main` → `git merge pricing`

### 39. Tidy up  

- **Kind:** Learn · **id:** `tidy-up-branches` · **XP:** 50 · **Par:** 1 command
- **Teaches:** Deleting branches — Deleting a merged branch only removes the label. The commits are safe, because main still points to them.
- **Question:** The contact branch is already merged into main, so its label isn't needed any more. Delete the contact branch.
- **Goals (checked as state, not as commands):** Delete the contact branch · The contact page is still in main
- **One solution:** `git branch -d contact`

### 40. Fix a merge conflict  

- **Kind:** Learn · **id:** `merge-conflict` · **XP:** 70 · **Par:** 4 commands
- **Teaches:** Merge conflict — When both sides changed the same line, Git stops and marks the file as conflicted. Pick a side: git checkout --ours <file> keeps your version, git checkout --theirs <file> takes theirs. Then git add the file and git commit.
- **Question:** You and a teammate both rewrote the homepage headline. Merge headline into main — Git will stop with a conflict. Your teammate's headline is better, so keep theirs, then finish the merge.
- **Goals (checked as state, not as commands):** Start the merge · Keep your teammate's headline · Finish with a merge commit
- **One solution:** `git merge headline` → `git checkout --theirs index.html` → `git add index.html` → `git commit -m "Merge headline"`

### 41. Keep your own version  

- **Kind:** Practice · **id:** `conflict-keep-ours` · **XP:** 70 · **Par:** 4 commands
- **Teaches:** --ours vs --theirs — During a merge, 'ours' is the branch you're standing on and 'theirs' is the branch being merged in. Choosing a side clears the conflict markers; git add then marks the file resolved.
- **Question:** Another conflict, in the price list. This time the price on main is the correct one, so keep your own version instead of the branch's, and finish the merge.
- **Goals (checked as state, not as commands):** Start the merge · Keep main's price · Finish with a merge commit
- **One solution:** `git merge sale` → `git checkout --ours prices.txt` → `git add prices.txt` → `git commit -m "Merge sale"`

### 42. Back out of a merge  

- **Kind:** Learn · **id:** `abort-merge` · **XP:** 55 · **Par:** 2 commands
- **Teaches:** git merge --abort — If a merge gets messy, git merge --abort puts everything back the way it was before you started. No harm done.
- **Question:** Start merging headline into main. When the conflict appears, decide now isn't the time: cancel the merge and get back to exactly where you were.
- **Goals (checked as state, not as commands):** Start the merge and hit the conflict · Cancel the merge · main is exactly as before · No leftover changes
- **One solution:** `git merge headline` → `git merge --abort`

### 43. Checkpoint: finish a feature  

- **Kind:** Checkpoint · **id:** `checkpoint-merging` · **XP:** 75 · **Par:** 3 commands
- **Teaches:** Merge, then tidy — Finishing a feature is three moves: switch to main, merge the branch, delete the branch. The commits stay in main's history.
- **Question:** The newsletter branch is finished and main has its own new commit. Do the full hand-over yourself: get the newsletter work into main, then clean up the branch label you no longer need.
- **Goals (checked as state, not as commands):** End up on main · main has the newsletter form · …and still has robots.txt · The newsletter branch is deleted
- **One solution:** `git switch main` → `git merge newsletter` → `git branch -d newsletter`


## Unit 6 — ⏪ Rollback

_Step back from the working directory, the staging area or a commit_ · 14 levels

### 44. Throw away an edit  

- **Kind:** Learn · **id:** `discard-changes` · **XP:** 50 · **Par:** 1 command
- **Teaches:** git restore — git restore <file> replaces your edits with the last saved version. Careful: the thrown-away edits are gone for good.
- **Question:** You scribbled over README.md by accident. Throw that edit away and get back the last saved version.
- **Goals (checked as state, not as commands):** README.md is back to the saved version · No leftover changes
- **One solution:** `git restore README.md`

### 45. Throw away every edit  

- **Kind:** Practice · **id:** `restore-everything` · **XP:** 50 · **Par:** 1 command
- **Teaches:** git restore . — The dot means the whole folder, just like with git add. git restore . resets every tracked file to the last saved version at once.
- **Question:** A bad find-and-replace wrecked all three files. None of it is worth keeping — bring the whole folder back to the last commit with one command.
- **Goals (checked as state, not as commands):** Nothing is left changed · All three files match the last commit
- **One solution:** `git restore .`

### 46. Oops, unstage that  

- **Kind:** Learn · **id:** `unstage` · **XP:** 50 · **Par:** 1 command
- **Teaches:** Unstaging — git restore --staged <file> is the opposite of git add. The file leaves the staging area, but your copy on disk stays untouched.
- **Question:** You ran git add . too quickly and passwords.txt got staged with app.js. Take passwords.txt out of the staging area (keep the file), but leave app.js staged.
- **Goals (checked as state, not as commands):** passwords.txt is no longer staged · app.js is still staged
- **One solution:** `git restore --staged passwords.txt`

### 47. Check before you commit  

- **Kind:** Practice · **id:** `diff-staged` · **XP:** 40 · **Par:** 2 commands
- **Teaches:** git diff --staged — git diff shows what is NOT staged yet; git diff --staged shows what IS staged — exactly what your next commit will contain.
- **Question:** Both files changed, but only the style.css change is ready. Stage style.css, double-check what's about to be committed, and commit only that — index.html keeps its unsaved change.
- **Goals (checked as state, not as commands):** Check the staged change (git diff --staged) · Commit style.css only · index.html is still unsaved
- **One solution:** `git add style.css` → `git diff --staged` → `git commit -m "Crimson headings"`

### 48. Unstage everything  

- **Kind:** Practice · **id:** `unstage-all` · **XP:** 55 · **Par:** 1 command
- **Teaches:** git reset HEAD — Plain git reset (or git reset HEAD) puts the staging area back to the last commit and leaves your files alone. It's git restore --staged for everything at once.
- **Question:** You staged four files in one go, but none of them are ready. Empty the staging area in one command — the files themselves stay exactly as they are.
- **Goals (checked as state, not as commands):** Nothing is staged any more · All four files are still in your folder
- **One solution:** `git reset HEAD`

### 49. Compare two commits  

- **Kind:** Practice · **id:** `compare-commits` · **XP:** 55 · **Par:** 0 commands
- **Teaches:** git diff <old>..<new> — git diff also compares two commits: git diff HEAD~2..HEAD shows everything that changed between them. Useful for checking what a rollback would throw away.
- **Question:** Before undoing anything, see what actually changed between the release two commits ago and now.
- **Goals (checked as state, not as commands):** Compare the last two commits with the older one
- **One solution:** `git diff HEAD~2..HEAD`

### 50. Fix a commit message  

- **Kind:** Learn · **id:** `amend` · **XP:** 55 · **Par:** 1 command
- **Teaches:** git commit --amend — --amend replaces your most recent commit with a new one. Only amend commits you haven't shared with anyone yet.
- **Question:** You just committed with the message 'Add lgoin page'. Oops! Replace that last commit with one whose message is 'Add login page' — without adding an extra commit.
- **Goals (checked as state, not as commands):** The last commit says 'Add login page' · Still exactly 2 commits
- **One solution:** `git commit --amend -m "Add login page"`

### 51. Forgot a file  

- **Kind:** Practice · **id:** `forgotten-file` · **XP:** 55 · **Par:** 2 commands
- **Teaches:** Amend with files — Anything you stage before git commit --amend is added into the last commit. --no-edit keeps its message.
- **Question:** You committed 'Add login page' but forgot login.css. Put login.css into that same commit instead of making a new one.
- **Goals (checked as state, not as commands):** login.css is in the last commit · The message is still 'Add login page' · Still exactly 2 commits
- **One solution:** `git add login.css` → `git commit --amend --no-edit`

### 52. Undo a commit, keep the work  

- **Kind:** Learn · **id:** `soft-reset` · **XP:** 60 · **Par:** 1 command
- **Teaches:** git reset --soft — reset moves your branch back to an earlier commit. With --soft, the changes from the undone commit stay staged, ready to commit again.
- **Question:** You committed half-finished work too early. Undo that commit, but keep all its changes staged so nothing is lost.
- **Goals (checked as state, not as commands):** main is back on 'Initial commit' · search.js is still staged
- **One solution:** `git reset --soft HEAD~1`

### 53. Rewind completely  

- **Kind:** Learn · **id:** `rewind` · **XP:** 60 · **Par:** 1 command
- **Teaches:** git reset --hard — --hard moves the branch back AND resets your files to match. Use it when you're sure you want to throw work away.
- **Question:** Last night you made two commits that broke the shop, and nobody has seen them. Move main back to 'Initial commit' and throw those broken changes away completely.
- **Goals (checked as state, not as commands):** main is back on 'Initial commit' · No broken changes left behind
- **One solution:** `git reset --hard HEAD~2`

### 54. Undo without rewriting  

- **Kind:** Learn · **id:** `safe-undo` · **XP:** 65 · **Par:** 1 command
- **Teaches:** git revert — revert makes a new commit that does the opposite of an old one. History only grows, so it's safe for commits other people already have.
- **Question:** The commit 'Add buggy popup' was shared with the whole team yesterday, so rewriting history is off the table. Undo it with a NEW commit, keeping the later 'Add blog' commit.
- **Goals (checked as state, not as commands):** Add a commit that reverts the popup · popup.js is gone · blog.html is still there
- **One solution:** `git revert HEAD~1`

### 55. Undo something older  

- **Kind:** Practice · **id:** `revert-older` · **XP:** 65 · **Par:** 1 command
- **Teaches:** Reverting by id — revert takes any commit, not just the last one. Find the id with git log, then revert it — Git works out the opposite change for you.
- **Question:** Three commits ago someone added a tracking pixel the team now wants gone. Two good commits came after it, so keep those and undo just that one — by its own id.
- **Goals (checked as state, not as commands):** tracker.js is gone · The help page is still there · …and so is the jobs page · Nothing was rewritten — a new commit undid it
- **One solution:** `git log --oneline` → `git revert 00e3cca`

### 56. Rescue lost work  

- **Kind:** Learn · **id:** `reflog-rescue` · **XP:** 70 · **Par:** 1 command
- **Teaches:** git reflog — The reflog is a diary of everywhere HEAD has been. Commits 'lost' by a reset are still listed there, so you can jump back to them.
- **Question:** Someone ran git reset --hard and the 'Important work' commit disappeared from main. It isn't really gone — find it in the reflog and bring main back to it.
- **Goals (checked as state, not as commands):** main has 'Important work' again · important.js is back
- **One solution:** `git reflog` → `git reset --hard HEAD@{1}`

### 57. Checkpoint: clean up the mess  

- **Kind:** Checkpoint · **id:** `checkpoint-undo` · **XP:** 80 · **Par:** 3 commands
- **Teaches:** Choosing the right undo — restore --staged takes something out of the staging area, plain restore throws away an edit on disk, and commit saves what's left. Pick the tool that matches the mistake.
- **Question:** Three problems at once: secrets.txt was staged by mistake, README.md has an edit you don't want, and app.js is genuinely ready. Sort it out — keep the secret file on disk but out of Git, throw the README edit away, and commit app.js on its own.
- **Goals (checked as state, not as commands):** secrets.txt is out of the staging area · …but still on disk · The README edit is thrown away · app.js is committed on its own
- **One solution:** `git restore --staged secrets.txt` → `git restore README.md` → `git commit -m "Add app"`


## Unit 7 — 🏷️ Tags & stash

_Mark releases and park unfinished work_ · 6 levels

### 58. Tag a release  

- **Kind:** Learn · **id:** `tag-release` · **XP:** 55 · **Par:** 1 command
- **Teaches:** Tags — A tag is a permanent name for one commit — perfect for releases like v1.0. Unlike branches, tags never move.
- **Question:** The shop is ready to launch! Mark the latest commit with a tag called v1.0.
- **Goals (checked as state, not as commands):** Tag the latest commit as v1.0
- **One solution:** `git tag v1.0`

### 59. Tag the past  

- **Kind:** Practice · **id:** `tag-the-past` · **XP:** 60 · **Par:** 1 command
- **Teaches:** HEAD~N — HEAD~1 is the commit before the current one, HEAD~2 the one before that. Most commands accept these references.
- **Question:** You forgot to tag the beta. The 'Beta ready' commit is two commits before HEAD. Tag it as v0.9 — without moving anywhere.
- **Goals (checked as state, not as commands):** Tag 'Beta ready' as v0.9 · Stay on main
- **One solution:** `git tag v0.9 HEAD~2`

### 60. Move a tag you got wrong  

- **Kind:** Practice · **id:** `retag` · **XP:** 60 · **Par:** 2 commands
- **Teaches:** git tag -d — Tags never move on their own, so a mistake is fixed in two steps: delete the tag with git tag -d, then create it again on the right commit. git tag on its own lists them.
- **Question:** v1.1 ended up on the wrong commit — it's on 'Fix typo' instead of the finished 'Add checkout'. Delete that tag and put v1.1 where it belongs.
- **Goals (checked as state, not as commands):** v1.1 points at 'Add checkout'
- **One solution:** `git tag -d v1.1` → `git tag v1.1`

### 61. Stash it away  

- **Kind:** Learn · **id:** `stash-it` · **XP:** 75 · **Par:** 5 commands
- **Teaches:** git stash — git stash packs away unfinished changes and gives you a clean folder. git stash pop unpacks them again, right where you left off.
- **Question:** You're halfway through a change on feature when your teammate's urgent hotfix has to go into main right now. Stash your unfinished work, merge hotfix into main, then return to feature and bring your work back.
- **Goals (checked as state, not as commands):** Merge hotfix into main · Come back to feature · Your unfinished work is back in your folder
- **One solution:** `git stash` → `git switch main` → `git merge hotfix` → `git switch feature` → `git stash pop`

### 62. Pick the right stash  

- **Kind:** Practice · **id:** `stash-pick` · **XP:** 75 · **Par:** 2 commands
- **Teaches:** The stash is a stack — Each git stash pushes onto a stack: stash@{0} is the newest. Name the one you want (git stash pop stash@{1}) and drop the ones you don't (git stash drop).
- **Question:** There are two stashes: the newest one is a dead end, but the older one holds the banner work you want. List them, bring back the older one, and throw the dead end away.
- **Goals (checked as state, not as commands):** The banner work is back in your folder · Both stashes are cleared out
- **One solution:** `git stash list` → `git stash pop stash@{1}` → `git stash drop`

### 63. Checkpoint: release day  

- **Kind:** Checkpoint · **id:** `checkpoint-tags-stash` · **XP:** 80 · **Par:** 5 commands
- **Teaches:** Park, look, resume — Git won't let you jump to another commit while unsaved changes would be overwritten. Stash gives you the clean folder you need, and pop hands your work straight back.
- **Question:** Release day, and you're mid-change in shop.html. Before tagging, the team wants you to check the very first version of the shop. Park your unfinished work, visit that first commit, come back to main, tag the release as v2.0, and pick your work up again.
- **Goals (checked as state, not as commands):** Visit the first commit · End up back on main · Tag 'Shop is ready' as v2.0 · Your unfinished work is back
- **One solution:** `git stash` → `git checkout HEAD~1` → `git switch main` → `git tag v2.0` → `git stash pop`


## Unit 8 — ✨ Rewrite history

_Copy, move and tidy commits_ · 6 levels

### 64. Cherry-pick a commit  

- **Kind:** Learn · **id:** `cherry-pick` · **XP:** 75 · **Par:** 1 command
- **Teaches:** git cherry-pick — cherry-pick copies the changes from one commit onto the branch you're on, as a brand-new commit.
- **Question:** The experiment branch is mostly chaos, but one commit — 'Fix header bug' — is gold. Copy just that commit onto main.
- **Goals (checked as state, not as commands):** main has 'Fix header bug' · …but not 'Wild idea' · …and not 'Crazy idea'
- **One solution:** `git cherry-pick experiment~1`

### 65. Cherry-pick by id  

- **Kind:** Practice · **id:** `cherry-pick-by-id` · **XP:** 80 · **Par:** 1 command
- **Teaches:** Commits have names — Any commit can be named by its id, a branch name, or something like design~1. Use git log to find the id, then hand it to cherry-pick.
- **Question:** A designer's branch has three commits, and you only want 'Fix the logo' — the middle one. Look up its id in the history, then copy just that commit onto main.
- **Goals (checked as state, not as commands):** main has the logo fix · …but not the giant banner · …and not the rainbows · You're still on main
- **One solution:** `git log --oneline design` → `git cherry-pick 4d580de`

### 66. Straighten the line  

- **Kind:** Learn · **id:** `rebase` · **XP:** 85 · **Par:** 2 commands
- **Teaches:** git rebase — rebase replays your branch's commits one by one on top of another branch, making fresh copies. Only rebase commits you haven't shared.
- **Question:** Your search branch started a while ago and main has moved on since. Rebase search onto main so its commits sit on top — one straight line, no merge commit.
- **Goals (checked as state, not as commands):** search starts from the tip of main · search is one straight line · search still has its own commits
- **One solution:** `git switch search` → `git rebase main`

### 67. Rebase, then hand it over  

- **Kind:** Practice · **id:** `rebase-then-merge` · **XP:** 85 · **Par:** 3 commands
- **Teaches:** Rebase then fast-forward — Rebasing first means the merge has nothing to combine, so Git can simply move the label. This is how teams keep history a straight line.
- **Question:** Finish the filters branch the tidy way: replay it on top of main, then bring it into main. Because it now sits directly on top, main just slides forward — no merge commit, one straight history.
- **Goals (checked as state, not as commands):** End up on main · main has the filter work · main is one straight line (no merge commit) · The sale page is still there
- **One solution:** `git rebase main` → `git switch main` → `git merge filters`

### 68. Squash commits  

- **Kind:** Learn · **id:** `squash` · **XP:** 85 · **Par:** 2 commands
- **Teaches:** Squashing — Squashing turns several small commits into one. A simple way: reset --soft back past them (the changes stay staged), then commit once.
- **Question:** Three messy 'WIP' commits clutter your history. Combine them into one clean commit called 'Add search' — keeping all the changes.
- **Goals (checked as state, not as commands):** The last commit is 'Add search' · Only 2 commits in total · All the work is kept
- **One solution:** `git reset --soft HEAD~3` → `git commit -m "Add search"`

### 69. Checkpoint: tidy before sharing  

- **Kind:** Checkpoint · **id:** `checkpoint-rewrite` · **XP:** 95 · **Par:** 5 commands
- **Teaches:** The tidy-up routine — Squash the noise, rebase onto main, then merge. History ends up as one readable line of finished work.
- **Question:** The gallery branch has two scrappy 'WIP' commits and main has moved on. Clean it up before anyone sees it: squash the two into one commit called 'Add gallery', replay it on top of main, and hand it over to main as a straight line.
- **Goals (checked as state, not as commands):** End up on main · main has one 'Add gallery' commit · …and no WIP commits · main is one straight line · The gallery work is all there
- **One solution:** `git reset --soft HEAD~2` → `git commit -m "Add gallery"` → `git rebase main` → `git switch main` → `git merge gallery`


## Unit 9 — 🤝 Working with a team

_Branches on GitHub, and keeping up with everyone else_ · 5 levels

### 70. Join a teammate's branch  

- **Kind:** Learn · **id:** `remote-branches` · **XP:** 70 · **Par:** 2 commands
- **Teaches:** Remote-tracking branches — git branch -r lists the branches Git knows GitHub has, like origin/design. Switching to that name creates your own copy, already linked to theirs.
- **Question:** A teammate published a branch called design. Fetch what's new, look at the list of branches GitHub has, then switch onto design to help out.
- **Goals (checked as state, not as commands):** Fetch what GitHub has · List the branches GitHub has (git branch -r) · Switch onto design · It's linked to origin/design
- **One solution:** `git fetch` → `git branch -r` → `git switch design`

### 71. Publish a branch  

- **Kind:** Learn · **id:** `publish-branch` · **XP:** 80 · **Par:** 1 command
- **Teaches:** git push -u — The first push of a new branch says where it goes. -u links your branch to the remote one, so next time a plain git push is enough.
- **Question:** You built a dark mode on a new branch. Publish the dark-mode branch to GitHub, and link it so future git push and git pull just work.
- **Goals (checked as state, not as commands):** GitHub has the dark-mode branch · dark-mode is linked to origin/dark-mode
- **One solution:** `git push -u origin dark-mode`

### 72. Push again, the short way  

- **Kind:** Practice · **id:** `push-again` · **XP:** 75 · **Par:** 1 command
- **Teaches:** Why -u was worth it — Because the branch is linked to origin/search, Git already knows where a plain git push should go. You only need -u the first time.
- **Question:** Your search branch is already on GitHub and linked to it. You've just committed one more change — send it up with the shortest command that works.
- **Goals (checked as state, not as commands):** GitHub has your newest commit · Nothing left to push
- **One solution:** `git push`

### 73. Push rejected!  

- **Kind:** Learn · **id:** `push-rejected` · **XP:** 75 · **Par:** 2 commands
- **Teaches:** Rejected push — Git won't let a push throw away commits already on the remote. Pull first to combine both sets of work, then push.
- **Question:** Try to push your blog commit. GitHub refuses, because a teammate pushed something you don't have. Bring their work in, then push again.
- **Goals (checked as state, not as commands):** GitHub has your blog · …and still has your teammate's work · Your main and GitHub match
- **One solution:** `git pull` → `git push`

### 74. Checkpoint: a day with the team  

- **Kind:** Checkpoint · **id:** `checkpoint-remotes` · **XP:** 90 · **Par:** 4 commands
- **Teaches:** The team round trip — Pull to get everyone else's work, push to share yours. A brand-new branch needs push -u once; after that, plain push and pull are enough.
- **Question:** You finished an FAQ page on its own branch, and meanwhile a teammate pushed to main. Do the whole round trip: bring their work into your main, then publish your faq branch to GitHub with a link for next time.
- **Goals (checked as state, not as commands):** Your main has the teammate's commit · GitHub has your faq branch · faq is linked to origin/faq
- **One solution:** `git switch main` → `git pull` → `git switch faq` → `git push -u origin faq`

