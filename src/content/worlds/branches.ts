import { goals } from "../goals";
import type { WorldDefinition } from "../types";

const siteWithHistory = [
  'echo "<h1>My Site</h1>" > index.html',
  'echo "h1 { color: hotpink; }" > style.css',
  "git init",
  "git add .",
  'git commit -m "First version"',
  'echo "<footer>Made with love</footer>" >> index.html',
  'git commit -am "Add footer"',
];

export const branchesWorld: WorldDefinition = {
  id: "branches",
  title: "Branches",
  emoji: "🌿",
  tagline: "Work on ideas side by side",
  theme: "violet",
  levels: [
    {
      id: "make-a-branch",
      title: "Make a branch",
      mission: "You want to try a dark-mode redesign without touching the live site. Create a branch called dark-mode. Notice that creating it doesn't move you onto it.",
      concept: {
        title: "Branch",
        body: "A branch is a label pointing at a commit. Making one is instant and copies nothing. HEAD shows which branch you're on.",
      },
      setup: siteWithHistory,
      goals: [goals.branchExists("dark-mode", "Create the dark-mode branch"), goals.onBranch("main", "You're still on main")],
      hints: ["git branch <name> creates a branch.", "Type: git branch dark-mode"],
      solution: ["git branch dark-mode"],
      xp: 40,
    },
    {
      id: "switch-branches",
      title: "Hop onto the branch",
      mission: "The dark-mode branch exists. Switch to it, so your next commits go there instead of main.",
      concept: {
        title: "git switch",
        body: "git switch moves HEAD to another branch. Your files change to match that branch's latest commit.",
      },
      setup: [...siteWithHistory, "git branch dark-mode"],
      goals: [goals.onBranch("dark-mode", "Be on dark-mode (HEAD → dark-mode)")],
      hints: ["The command is git switch followed by the branch name.", "Type: git switch dark-mode"],
      solution: ["git switch dark-mode"],
      xp: 40,
    },
    {
      id: "commit-on-branch",
      title: "Work on the side",
      phase: "practice",
      mission: "You're on dark-mode, and you've already made the site dark in style.css. Commit that change. Watch: only dark-mode moves forward — main stays put.",
      concept: {
        title: "Only your branch moves",
        body: "When you commit, only the branch HEAD points at moves to the new commit. Every other branch stays exactly where it was.",
      },
      setup: [...siteWithHistory, "git switch -c dark-mode", 'echo "body { background: #111; color: #eee; }" > style.css'],
      goals: [goals.newCommitsOn("dark-mode", 1, "Commit on dark-mode"), goals.unchanged("main", "main hasn't moved")],
      hints: ["Stage style.css and commit — or do both at once with git commit -a.", 'Type: git commit -am "Dark theme"'],
      solution: ['git commit -am "Dark theme"'],
      xp: 45,
    },
    {
      id: "rename-branch",
      title: "Fix a branch name",
      mission: "You created the branch but typed it wrong: 'dark-mdoe'. Rename it to dark-mode — no need to switch anywhere.",
      concept: {
        title: "git branch -m",
        body: "-m (move) renames a branch. The commits don't care about names, so nothing else changes. git branch on its own lists what you have.",
      },
      setup: [...siteWithHistory, "git branch dark-mdoe"],
      goals: [
        goals.branchExists("dark-mode", "There's a dark-mode branch"),
        goals.custom("typo-gone", "The misspelled branch is gone", ({ state }) => state.initialized && !Object.hasOwn(state.branches, "dark-mdoe")),
      ],
      hints: ["git branch -m takes the old name and the new name.", "Type: git branch -m dark-mdoe dark-mode"],
      solution: ["git branch -m dark-mdoe dark-mode"],
      xp: 45,
    },
    {
      id: "copy-branch",
      title: "Keep a safety copy",
      phase: "practice",
      mission: "You're about to try something risky on dark-mode. First make a branch called dark-mode-backup that points at the same commit, so you can always come back — and stay on dark-mode.",
      concept: {
        title: "git branch -c",
        body: "git branch -c <name> copies the branch you're on, history and all, under a new name. Branches are just labels, so a safety copy costs nothing.",
      },
      setup: [...siteWithHistory, "git switch -c dark-mode", 'echo "body { background: #111; }" > style.css', 'git commit -am "Dark theme"'],
      goals: [
        goals.branchExists("dark-mode-backup", "Create dark-mode-backup"),
        goals.custom(
          "same-commit",
          "It points at the same commit as dark-mode",
          ({ state }) => !!state.branches["dark-mode-backup"] && state.branches["dark-mode-backup"] === state.branches["dark-mode"],
        ),
        goals.onBranch("dark-mode", "You're still on dark-mode"),
      ],
      hints: ["git branch -c copies the current branch under a new name.", "Type: git branch -c dark-mode-backup"],
      solution: ["git branch -c dark-mode-backup"],
      xp: 45,
    },
    {
      id: "two-paths",
      title: "Two paths",
      phase: "practice",
      mission:
        "A typo was reported on the live site, and you've already fixed it in index.html — but you're still on dark-mode. Switch to main (uncommitted changes come with you) and commit the fix there. History splits into two paths!",
      concept: {
        title: "Diverging history",
        body: "Commit on two different branches and history forks: both share an older commit, then grow separately.",
      },
      setup: [
        ...siteWithHistory,
        "git switch -c dark-mode",
        'echo "body { background: #111; }" > style.css',
        'git commit -am "Dark theme"',
        'edit index.html "<p>Welcome!</p>"',
      ],
      goals: [goals.newCommitsOn("main", 1, "Commit the fix on main"), goals.diverged("main", "dark-mode", "History splits into two paths")],
      hints: ["Your uncommitted fix travels with you when you switch: git switch main", 'Now commit it on main: git commit -am "Fix typo"'],
      solution: ["git switch main", 'git commit -am "Fix typo"'],
      xp: 45,
    },
    {
      id: "create-and-switch",
      title: "Create and switch at once",
      mission: "Urgent bug! Create a branch called hotfix and switch to it — using just one command.",
      concept: {
        title: "git switch -c",
        body: "-c creates a new branch where you are and switches to it straight away. It's the everyday way to start new work.",
      },
      setup: siteWithHistory,
      goals: [goals.onBranch("hotfix", "Be on a new hotfix branch")],
      hints: ["git switch has an option that creates the branch first.", "Type: git switch -c hotfix"],
      solution: ["git switch -c hotfix"],
      xp: 45,
    },
    {
      id: "start-a-feature",
      title: "Start a second idea",
      phase: "practice",
      mission: "A search box is your next idea, and search.js is already written but unsaved. Start a branch called search in one command, commit the file there, and leave main untouched.",
      concept: {
        title: "A branch per idea",
        body: "Branches are cheap, so start one for every idea. main keeps working while your idea grows on the side.",
      },
      setup: [...siteWithHistory, 'echo "searchBox()" > search.js'],
      goals: [
        goals.onBranch("search", "Be on a new search branch"),
        goals.committedFile("search.js", "search.js is committed there"),
        goals.unchanged("main", "main hasn't moved"),
      ],
      hints: ["One command creates the branch and switches to it: git switch -c search", 'Then save the file: git add search.js and git commit -m "Add search box"'],
      solution: ["git switch -c search", "git add search.js", 'git commit -m "Add search box"'],
      xp: 50,
    },
    {
      id: "detached-head",
      title: "Visit an old commit",
      mission: "Your boss wants to see the very first version of the site. Jump back to that first commit — watch the files in your Working directory change — then come back to main.",
      concept: {
        title: "Detached HEAD",
        body: "You can point HEAD straight at an old commit to look around. That's called detached HEAD. Switch back to a branch before doing real work.",
      },
      setup: [...siteWithHistory, 'echo "h1 { color: teal; }" > style.css', 'git commit -am "Teal headings"'],
      goals: [
        goals.custom(
          "visit-first",
          "Visit the 'First version' commit",
          ({ state }) => state.head.kind === "detached" && state.commits[state.head.commit]?.message === "First version",
          true,
        ),
        goals.onBranch("main", "Come back to main"),
      ],
      hints: ["HEAD~2 means two commits before HEAD: git checkout HEAD~2", "Look around, then come home with git switch main"],
      solution: ["git checkout HEAD~2", "git switch main"],
      xp: 55,
    },
    {
      id: "branch-at-commit",
      title: "Branch from the past",
      phase: "practice",
      mission: "That old 'First version' commit is worth reviving. Create a branch called revival that starts there — two commits back — without leaving main.",
      concept: {
        title: "Branch anywhere",
        body: "git branch <name> <start> puts the new label on any commit you name, not just the one you're on. Handy for going back to a good state.",
      },
      setup: [...siteWithHistory, 'echo "h1 { color: teal; }" > style.css', 'git commit -am "Teal headings"'],
      goals: [
        goals.custom(
          "at-first",
          "revival starts at 'First version'",
          ({ state }) => {
            const tip = state.branches.revival;
            return !!tip && state.commits[tip]?.message === "First version";
          },
        ),
        goals.onBranch("main", "You're still on main"),
      ],
      hints: ["git branch takes a second argument: where to start.", "Type: git branch revival HEAD~2"],
      solution: ["git branch revival HEAD~2"],
      xp: 50,
    },
    {
      id: "hop-between-branches",
      title: "Hop over and back",
      phase: "practice",
      mission: "You're on feature. Someone asks what main looks like right now — go and see, then come back to feature to carry on.",
      concept: {
        title: "Switching is cheap",
        body: "Switching branches just moves HEAD and rewrites your files to match. As long as your work is committed, you can hop about as much as you like.",
      },
      setup: [...siteWithHistory, "git switch -c feature", 'echo "feature()" > feature.js', "git add .", 'git commit -m "Start feature"'],
      goals: [
        goals.custom("visited-main", "Visit main", ({ state }) => state.head.kind === "branch" && state.head.name === "main", true),
        goals.onBranch("feature", "End up back on feature"),
        goals.unchanged("feature", "feature is untouched"),
      ],
      hints: ["Go there: git switch main", "Then come back: git switch feature"],
      solution: ["git switch main", "git switch feature"],
      xp: 45,
    },
    {
      id: "rename-before-sharing",
      title: "Rename before sharing",
      phase: "practice",
      mission: "Your branch is called temp, which tells nobody anything. Rename it to search-filters before the team sees it — you're on it right now.",
      concept: {
        title: "Renaming the branch you're on",
        body: "With one name, git branch -m renames the branch you're standing on. HEAD follows it, so nothing else changes.",
      },
      setup: [...siteWithHistory, "git switch -c temp", 'echo "filters()" > filters.js', "git add .", 'git commit -m "Add filters"'],
      goals: [
        goals.onBranch("search-filters", "You're on search-filters"),
        goals.custom("temp-gone", "There's no temp branch left", ({ state }) => state.initialized && !Object.hasOwn(state.branches, "temp")),
        goals.containsMessage("search-filters", "Add filters", "Your commit came along"),
      ],
      hints: ["One name renames the branch you're on.", "Type: git branch -m search-filters"],
      solution: ["git branch -m search-filters"],
      xp: 50,
    },
    {
      id: "checkpoint-branches",
      title: "Checkpoint: side by side",
      phase: "checkpoint",
      mission:
        "A summer promo banner is written in promo.html but not saved. Keep main clean: put the banner on its own branch called promo, commit it there, then go back to main and leave it exactly as it was.",
      concept: {
        title: "Branch, commit, return",
        body: "This is the everyday branch rhythm: start a branch for the idea, commit on it, and switch back to main when you're done.",
      },
      setup: [...siteWithHistory, 'echo "<aside>Summer sale!</aside>" > promo.html'],
      goals: [
        goals.branchExists("promo", "Create the promo branch"),
        goals.custom("banner-saved", "The banner is committed on promo", ({ state }) => {
          const tip = state.branches.promo;
          return !!tip && Object.hasOwn(state.commits[tip].tree, "promo.html");
        }),
        goals.unchanged("main", "main is exactly as before"),
        goals.onBranch("main", "You end up back on main"),
      ],
      hints: ["Start the branch and switch to it in one go, then stage and commit the file.", 'git switch -c promo, git add promo.html, git commit -m "Add promo banner", then git switch main'],
      solution: ["git switch -c promo", "git add promo.html", 'git commit -m "Add promo banner"', "git switch main"],
      xp: 60,
    },
  ],
};
