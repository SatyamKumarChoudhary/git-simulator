import { describe, expect, it } from "vitest";
import { engine } from "@/engine";
import { findLevel, levelStartState } from "./index";

/**
 * A level is judged by the state you end up in, not by the commands you typed. Every row here is a different route
 * to the same place — `git checkout` instead of `git switch`, two adds instead of one, fetch + merge instead of pull —
 * and each one must satisfy the level's goals just like its reference solution does.
 */
const ROUTES: Array<[levelId: string, route: string[], description: string]> = [
  ["start-tracking", ["git init ."], "init with an explicit folder"],
  ["ask-git", ["git status -s"], "short status"],
  ["stage-fright", ["git add index.*"], "a glob instead of the full name"],
  ["delete-a-file", ["rm old-page.html", "git add old-page.html", 'git commit -m "Remove old page"'], "delete the file, then stage the deletion"],
  ["clone", ["git init", "git remote add origin https://github.com/team/website", "git pull origin main"], "init + remote add + pull instead of clone"],
  ["abort-merge", ["git merge headline", "git reset --hard HEAD"], "reset --hard instead of merge --abort"],
  ["reflog-rescue", ["git reflog", "git merge HEAD@{1}"], "merge the lost commit instead of reset --hard"],
  ["stage-two", ["git add index.html", "git add style.css"], "two separate adds"],
  ["first-commit", ['git commit --message "Add homepage"'], "--message instead of -m"],
  ["commit-again", ["git add .", 'git commit -m "Add styles"'], "add . instead of naming the file"],
  ["save-everything", ["git add style.css about.html", 'git commit -m "Add styles and about page"'], "naming both files"],
  ["sign-your-work", ['git config user.name "Ada"', 'git config user.email "ada@example.com"', 'git commit --message "Update readme"'], "--message"],
  ["checkpoint-first-repo", ["git init", "git add index.html style.css", 'git commit -m "First version"'], "naming both files"],

  ["daily-loop", ['git commit -am "Purple headings"'], "commit -am instead of add then commit"],
  ["commit-am", ["git add index.html", 'git commit -m "Add welcome line"'], "add then commit instead of commit -am"],
  ["spot-the-difference", ["git diff style.css", "git add .", 'git commit -m "Teal headings"'], "diff one file, then add and commit"],
  ["diff-staged", ["git add style.css", "git diff --cached", 'git commit -m "Crimson headings"'], "--cached instead of --staged"],
  ["read-history", ["git log", "git show HEAD~2"], "show by position instead of by id"],
  ["one-change-one-commit", ["git add about.html", 'git commit -m "Add about page"', "git add style.css", 'git commit -m "Update colours"'], "the other order"],
  ["ignore-junk", ["git add app.js .gitignore", 'git commit -m "Add app"'], "naming both files instead of add ."],
  ["checkpoint-everyday", ["git add pricing.html", 'git commit -m "Add pricing page"', "git add style.css", 'git commit -m "Navy headings"'], "the other order"],

  ["make-a-branch", ["git switch -c dark-mode", "git switch main"], "create by switching, then come back"],
  ["switch-branches", ["git checkout dark-mode"], "checkout instead of switch"],
  ["commit-on-branch", ["git add style.css", 'git commit -m "Dark theme"'], "add then commit"],
  ["rename-branch", ["git branch dark-mode", "git branch -d dark-mdoe"], "create and delete instead of -m"],
  ["two-paths", ["git checkout main", "git add index.html", 'git commit -m "Fix typo"'], "checkout, then add and commit"],
  ["create-and-switch", ["git branch hotfix", "git switch hotfix"], "branch then switch instead of switch -c"],
  ["start-a-feature", ["git checkout -b search", "git add .", 'git commit -m "Add search box"'], "checkout -b instead of switch -c"],
  ["detached-head", ["git switch --detach HEAD~2", "git checkout main"], "switch --detach and checkout"],
  ["checkpoint-branches", ["git branch promo", "git checkout promo", "git add .", 'git commit -m "Add promo banner"', "git checkout main"], "branch, checkout, add ."],

  ["fast-forward", ["git checkout main", "git merge dark-mode"], "checkout instead of switch"],
  ["paths-meet", ['git merge contact -m "Merge contact"'], "merge with an explicit message"],
  ["merge-from-main", ["git checkout main", "git merge pricing"], "checkout instead of switch"],
  ["tidy-up-branches", ["git branch -D contact"], "force delete instead of -d"],
  ["merge-conflict", ["git merge headline", "git restore --theirs index.html", "git add .", 'git commit -m "Merge headline"'], "restore --theirs instead of checkout --theirs"],
  ["conflict-keep-ours", ["git merge sale", "git restore --ours prices.txt", "git add .", 'git commit -m "Merge sale"'], "restore --ours instead of checkout --ours"],
  ["checkpoint-merging", ["git checkout main", "git merge newsletter", "git branch -D newsletter"], "checkout and force delete"],

  ["discard-changes", ["git checkout -- README.md"], "the classic checkout -- <file>"],
  ["restore-everything", ["git restore README.md", "git restore app.js", "git restore style.css"], "one file at a time"],
  ["unstage", ["git reset HEAD passwords.txt"], "reset instead of restore --staged"],
  ["unstage", ["git rm --cached passwords.txt"], "rm --cached instead of restore --staged"],
  ["amend", ['git commit --amend --message "Add login page"'], "--message instead of -m"],
  ["forgotten-file", ["git add .", "git commit --amend --no-edit"], "add . instead of naming the file"],
  ["soft-reset", ["git reset --soft HEAD^"], "HEAD^ instead of HEAD~1"],
  ["rewind", ["git reset --hard HEAD^^"], "HEAD^^ instead of HEAD~2"],
  ["safe-undo", ["git revert HEAD^"], "HEAD^ instead of HEAD~1"],
  ["revert-older", ["git revert HEAD~2"], "by position instead of by id"],
  ["checkpoint-undo", ["git restore README.md", "git restore --staged secrets.txt", 'git commit -m "Add app"'], "the other order"],

  ["tag-release", ["git tag v1.0 HEAD"], "naming the commit explicitly"],
  ["tag-the-past", ["git tag v0.9 HEAD^^"], "HEAD^^ instead of HEAD~2"],
  ["retag", ["git tag --delete v1.1", "git tag v1.1 HEAD"], "--delete and an explicit commit"],
  ["stash-it", ["git stash push", "git checkout main", "git merge hotfix", "git checkout feature", "git stash pop"], "stash push and checkout"],
  ["stash-pick", ["git stash apply stash@{1}", "git stash drop stash@{1}", "git stash drop"], "apply and drop instead of pop"],
  ["checkpoint-tags-stash", ["git stash push", "git switch --detach HEAD~1", "git checkout main", "git tag v2.0 HEAD", "git stash pop"], "stash push, switch --detach"],

  ["cherry-pick", ["git cherry-pick experiment^"], "experiment^ instead of experiment~1"],
  ["cherry-pick-by-id", ["git cherry-pick design~1"], "by position instead of by id"],
  ["rebase", ["git checkout search", "git rebase main"], "checkout instead of switch"],
  ["rebase-then-merge", ["git rebase main", "git checkout main", "git merge filters"], "checkout instead of switch"],
  ["squash", ["git reset --soft HEAD~3", 'git commit --message "Add search"'], "--message instead of -m"],
  ["checkpoint-rewrite", ["git reset --soft HEAD^^", 'git commit -m "Add gallery"', "git rebase main", "git checkout main", "git merge gallery"], "HEAD^^ and checkout"],

  ["connect-remote", ["git remote add origin https://github.com/team/shop", "git push --set-upstream origin main"], "--set-upstream instead of -u"],
  ["default-branch", ["git branch -m master main", "git push -u origin main"], "-m instead of -M"],
  ["checkpoint-remote", ["git branch -m master main", "git remote add origin https://github.com/team/shop", "git push --set-upstream origin main"], "-m and --set-upstream"],
  ["copy-branch", ["git branch dark-mode-backup"], "plain branch instead of -c"],
  ["unstage-all", ["git reset"], "plain reset instead of reset HEAD"],
  ["compare-commits", ["git diff HEAD~2 HEAD"], "two arguments instead of .."],
  ["push-again", ["git push origin search"], "naming the remote and branch"],
  ["push", ["git add about.html", 'git commit -m "Add about page"', "git push origin main"], "naming the remote and branch"],
  ["fetch", ["git fetch origin", "git merge origin/main"], "naming the remote"],
  ["pull", ["git fetch", "git merge origin/main"], "fetch + merge instead of pull"],
  ["remote-branches", ["git fetch", "git branch -a", "git checkout design"], "branch -a and checkout"],
  ["push-rejected", ["git fetch", "git merge origin/main", "git push"], "fetch + merge instead of pull"],
  ["publish-branch", ["git push --set-upstream origin dark-mode"], "--set-upstream instead of -u"],
  ["checkpoint-remotes", ["git checkout main", "git fetch", "git merge origin/main", "git checkout faq", "git push --set-upstream origin faq"], "fetch + merge and long option"],
];

describe("levels are judged by the state you reach, not the route", () => {
  it.each(ROUTES)("%s can also be solved by %#: %s", (levelId, route) => {
    const level = findLevel(levelId)?.level;
    expect(level, `unknown level: ${levelId}`).toBeDefined();
    if (!level) return;

    const initial = levelStartState(level);
    let state = initial;
    const commands: string[] = [];
    const achieved = new Set<string>();

    for (const command of route) {
      const result = engine.execute(command, state);
      expect(result.ok, `"${command}" failed in ${levelId}`).toBe(true);
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
  });
});
