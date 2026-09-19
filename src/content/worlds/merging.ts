import { goals } from "../goals";
import type { WorldDefinition } from "../types";

const base = ['echo "<h1>My Site</h1>" > index.html', "git init", "git add .", 'git commit -m "First version"'];

/** main and `headline` both rewrote the same line, so merging stops with a conflict. */
const conflictSetup = [
  'echo "<h1>Welcome</h1>" > index.html',
  "git init",
  "git add .",
  'git commit -m "Initial homepage"',
  "git switch -c headline",
  'echo "<h1>Welcome to the future</h1>" > index.html',
  'git commit -am "Bold headline"',
  "git switch main",
  'echo "<h1>Hello, friend</h1>" > index.html',
  'git commit -am "Friendly headline"',
];

export const mergingWorld: WorldDefinition = {
  id: "merging",
  title: "Merging",
  emoji: "🔀",
  tagline: "Bring branches back together",
  theme: "pink",
  levels: [
    {
      id: "fast-forward",
      title: "Fast-forward",
      mission: "The dark-mode branch is finished and main hasn't changed since. Bring dark-mode's work into main. Remember: you merge INTO the branch you're on.",
      concept: {
        title: "Fast-forward merge",
        body: "If main has no new commits of its own, Git simply slides the main label forward to the newest commit. No extra commit needed.",
      },
      setup: [
        ...base,
        "git switch -c dark-mode",
        'echo "body { background: #111; }" > dark.css',
        "git add .",
        'git commit -m "Add dark stylesheet"',
        'echo "<link rel=stylesheet href=dark.css>" >> index.html',
        'git commit -am "Use dark stylesheet"',
      ],
      goals: [
        goals.onBranch("main", "Be on main"),
        goals.includes("main", "dark-mode", "main has dark-mode's commits"),
        goals.custom("no-merge-commit", "No merge commit was needed", ({ state }) => {
          const tip = state.branches.main;
          return !!tip && state.commits[tip].parents.length <= 1 && tip === state.branches["dark-mode"];
        }),
      ],
      hints: ["You're on dark-mode. Go to the branch that should receive the work: git switch main", "Then bring the work in: git merge dark-mode"],
      solution: ["git switch main", "git merge dark-mode"],
      xp: 50,
    },
    {
      id: "paths-meet",
      title: "When paths meet",
      mission: "You built a contact page on the contact branch while a teammate added analytics on main. Both have new commits. Merge contact into main.",
      concept: {
        title: "Merge commit",
        body: "When both branches moved on, Git combines their changes into a merge commit — a commit with two parents that ties the paths together.",
      },
      setup: [
        ...base,
        "git switch -c contact",
        'echo "<form>Say hi!</form>" > contact.html',
        "git add .",
        'git commit -m "Add contact page"',
        "git switch main",
        'echo "track()" > analytics.js',
        "git add .",
        'git commit -m "Add analytics"',
      ],
      goals: [
        goals.mergeCommitAt("main", "Create a merge commit on main"),
        goals.committedFile("contact.html", "main has contact.html"),
        goals.committedFile("analytics.js", "…and still has analytics.js"),
      ],
      hints: ["You're already on main, so just merge the other branch.", "Type: git merge contact"],
      solution: ["git merge contact"],
      xp: 55,
    },
    {
      id: "merge-from-main",
      title: "Merge from the right side",
      phase: "practice",
      mission: "The pricing branch is done, and main has moved on too. You're standing on pricing — get its work into main, not the other way round.",
      concept: {
        title: "Direction matters",
        body: "git merge brings the named branch INTO the branch you're on. To update main, switch to main first and merge the other branch.",
      },
      setup: [
        ...base,
        "git switch -c pricing",
        'echo "<h1>Pricing</h1>" > pricing.html',
        "git add .",
        'git commit -m "Add pricing page"',
        "git switch main",
        'echo "<h1>Blog</h1>" > blog.html',
        "git add .",
        'git commit -m "Add blog"',
        "git switch pricing",
      ],
      goals: [
        goals.onBranch("main", "End up on main"),
        goals.mergeCommitAt("main", "main has a merge commit"),
        goals.committedFile("pricing.html", "main has the pricing page"),
        goals.unchanged("pricing", "pricing itself didn't move"),
      ],
      hints: ["The branch that should receive the work is main, so go there first.", "git switch main, then git merge pricing"],
      solution: ["git switch main", "git merge pricing"],
      xp: 55,
    },
    {
      id: "tidy-up-branches",
      title: "Tidy up",
      mission: "The contact branch is already merged into main, so its label isn't needed any more. Delete the contact branch.",
      concept: {
        title: "Deleting branches",
        body: "Deleting a merged branch only removes the label. The commits are safe, because main still points to them.",
      },
      setup: [...base, "git switch -c contact", 'echo "<form>Say hi!</form>" > contact.html', "git add .", 'git commit -m "Add contact page"', "git switch main", "git merge contact"],
      goals: [
        goals.custom("deleted", "Delete the contact branch", ({ state }) => state.initialized && !Object.hasOwn(state.branches, "contact")),
        goals.containsMessage("main", "Add contact page", "The contact page is still in main"),
      ],
      hints: ["git branch -d deletes a branch that's already merged.", "Type: git branch -d contact"],
      solution: ["git branch -d contact"],
      xp: 50,
    },
    {
      id: "merge-conflict",
      title: "Fix a merge conflict",
      mission: "You and a teammate both rewrote the homepage headline. Merge headline into main — Git will stop with a conflict. Your teammate's headline is better, so keep theirs, then finish the merge.",
      concept: {
        title: "Merge conflict",
        body: "When both sides changed the same line, Git stops and marks the file as conflicted. Pick a side: git checkout --ours <file> keeps your version, git checkout --theirs <file> takes theirs. Then git add the file and git commit.",
      },
      setup: conflictSetup,
      goals: [
        goals.custom(
          "hit-conflict",
          "Start the merge",
          ({ state }) => !!state.merge?.conflicts.includes("index.html") || (state.merge === null && state.commits[state.branches.main]?.parents.length === 2),
          true,
        ),
        goals.custom("keep-theirs", "Keep your teammate's headline", ({ state, initial }) => {
          const theirs = initial.commits[initial.branches.headline]?.tree["index.html"];
          return theirs !== undefined && state.workdir["index.html"] === theirs;
        }),
        goals.mergeCommitAt("main", "Finish with a merge commit"),
      ],
      hints: [
        "Start with git merge headline — Git reports a conflict in index.html.",
        "Take your teammate's version: git checkout --theirs index.html",
        'Mark it resolved and finish: git add index.html, then git commit -m "Merge headline"',
      ],
      solution: ["git merge headline", "git checkout --theirs index.html", "git add index.html", 'git commit -m "Merge headline"'],
      xp: 70,
    },
    {
      id: "conflict-keep-ours",
      title: "Keep your own version",
      phase: "practice",
      mission: "Another conflict, in the price list. This time the price on main is the correct one, so keep your own version instead of the branch's, and finish the merge.",
      concept: {
        title: "--ours vs --theirs",
        body: "During a merge, 'ours' is the branch you're standing on and 'theirs' is the branch being merged in. Choosing a side clears the conflict markers; git add then marks the file resolved.",
      },
      setup: [
        'echo "T-shirt: 20" > prices.txt',
        "git init",
        "git add .",
        'git commit -m "Add prices"',
        "git switch -c sale",
        'echo "T-shirt: 5" > prices.txt',
        'git commit -am "Sale price"',
        "git switch main",
        'echo "T-shirt: 25" > prices.txt',
        'git commit -am "New price"',
      ],
      goals: [
        goals.custom("hit-conflict", "Start the merge", ({ state }) => !!state.merge?.conflicts.includes("prices.txt") || (state.merge === null && state.commits[state.branches.main]?.parents.length === 2), true),
        goals.custom("kept-ours", "Keep main's price", ({ state, initial }) => {
          const ours = initial.commits[initial.branches.main]?.tree["prices.txt"];
          return ours !== undefined && state.workdir["prices.txt"] === ours;
        }),
        goals.mergeCommitAt("main", "Finish with a merge commit"),
      ],
      hints: [
        "Start it: git merge sale — Git reports a conflict in prices.txt.",
        "Keep your side: git checkout --ours prices.txt",
        'Then git add prices.txt and git commit -m "Merge sale"',
      ],
      solution: ["git merge sale", "git checkout --ours prices.txt", "git add prices.txt", 'git commit -m "Merge sale"'],
      xp: 70,
    },
    {
      id: "abort-merge",
      title: "Back out of a merge",
      mission: "Start merging headline into main. When the conflict appears, decide now isn't the time: cancel the merge and get back to exactly where you were.",
      concept: {
        title: "git merge --abort",
        body: "If a merge gets messy, git merge --abort puts everything back the way it was before you started. No harm done.",
      },
      setup: conflictSetup,
      goals: [
        goals.custom("hit-conflict", "Start the merge and hit the conflict", ({ state }) => !!state.merge?.conflicts.length, true),
        goals.custom("aborted", "Cancel the merge", ({ state }) => state.merge === null),
        goals.unchanged("main", "main is exactly as before"),
        goals.cleanTree("No leftover changes"),
      ],
      hints: ["First start it: git merge headline", "Then cancel: git merge --abort"],
      solution: ["git merge headline", "git merge --abort"],
      xp: 55,
    },
    {
      id: "fast-forward-again",
      title: "Another easy merge",
      phase: "practice",
      mission: "The docs branch has two new commits and main has none of its own. Bring the docs work into main, then get rid of the branch label.",
      concept: {
        title: "Merge, then tidy",
        body: "A fast-forward plus a branch delete is the everyday ending for a small piece of work.",
      },
      setup: [
        ...base,
        "git switch -c docs",
        'echo "<h1>Docs</h1>" > docs.html',
        "git add .",
        'git commit -m "Add docs page"',
        'edit docs.html "<p>How to install</p>"',
        'git commit -am "Add install notes"',
      ],
      goals: [
        goals.onBranch("main", "Be on main"),
        goals.committedFile("docs.html", "main has the docs"),
        goals.linearHistory("main", "No merge commit was needed"),
        goals.custom("branch-gone", "The docs branch is deleted", ({ state }) => state.initialized && !Object.hasOwn(state.branches, "docs")),
      ],
      hints: ["Go to the branch that should receive the work: git switch main, then git merge docs", "Then clean up: git branch -d docs"],
      solution: ["git switch main", "git merge docs", "git branch -d docs"],
      xp: 60,
    },
    {
      id: "conflict-again",
      title: "One more conflict",
      phase: "practice",
      mission: "You and a teammate both edited the footer. Merge footer into main and keep their version this time, then finish the merge.",
      concept: {
        title: "Conflicts are routine",
        body: "A conflict just means Git needs a human decision. Pick the side you want with --ours or --theirs, stage the file, commit. Nothing is lost either way.",
      },
      setup: [
        'echo "<footer>© 2024</footer>" > footer.html',
        "git init",
        "git add .",
        'git commit -m "Add footer"',
        "git switch -c footer",
        'echo "<footer>© 2025 · Made with care</footer>" > footer.html',
        'git commit -am "Nicer footer"',
        "git switch main",
        'echo "<footer>© 2025</footer>" > footer.html',
        'git commit -am "Update year"',
      ],
      goals: [
        goals.custom("hit-conflict", "Start the merge", ({ state }) => !!state.merge?.conflicts.includes("footer.html") || (state.merge === null && state.commits[state.branches.main]?.parents.length === 2), true),
        goals.custom("kept-theirs", "Keep the footer branch's version", ({ state, initial }) => {
          const theirs = initial.commits[initial.branches.footer]?.tree["footer.html"];
          return theirs !== undefined && state.workdir["footer.html"] === theirs;
        }),
        goals.mergeCommitAt("main", "Finish with a merge commit"),
      ],
      hints: ["Start it: git merge footer", "Take their side: git checkout --theirs footer.html", 'Then git add footer.html and git commit -m "Merge footer"'],
      solution: ["git merge footer", "git checkout --theirs footer.html", "git add footer.html", 'git commit -m "Merge footer"'],
      xp: 70,
    },
    {
      id: "abort-then-finish",
      title: "Abort, then do it properly",
      phase: "practice",
      mission: "Merging the pricing branch hits a conflict and you're not sure yet. Cancel the merge, think about it, then start again and keep the pricing branch's version.",
      concept: {
        title: "Aborting costs nothing",
        body: "git merge --abort puts everything back exactly as it was, so you can always stop, think, and start the merge again when you're ready.",
      },
      setup: [
        'echo "T-shirt: 20" > prices.txt',
        "git init",
        "git add .",
        'git commit -m "Add prices"',
        "git switch -c pricing",
        'echo "T-shirt: 18" > prices.txt',
        'git commit -am "New pricing"',
        "git switch main",
        'echo "T-shirt: 22" > prices.txt',
        'git commit -am "Raise prices"',
      ],
      goals: [
        goals.containsMessage("main", "Raise prices", "Your own commit is still in history"),
        goals.custom("kept-theirs", "Keep the pricing branch's price", ({ state, initial }) => {
          const theirs = initial.commits[initial.branches.pricing]?.tree["prices.txt"];
          return theirs !== undefined && state.workdir["prices.txt"] === theirs;
        }),
        goals.mergeCommitAt("main", "Finish with a merge commit"),
      ],
      hints: [
        "Start it and stop it: git merge pricing, then git merge --abort",
        "Now do it for real: git merge pricing, then git checkout --theirs prices.txt",
        'Finish: git add prices.txt, then git commit -m "Merge pricing"',
      ],
      solution: ["git merge pricing", "git merge --abort", "git merge pricing", "git checkout --theirs prices.txt", "git add prices.txt", 'git commit -m "Merge pricing"'],
      xp: 75,
    },
    {
      id: "checkpoint-merging",
      title: "Checkpoint: finish a feature",
      phase: "checkpoint",
      mission:
        "The newsletter branch is finished and main has its own new commit. Do the full hand-over yourself: get the newsletter work into main, then clean up the branch label you no longer need.",
      concept: {
        title: "Merge, then tidy",
        body: "Finishing a feature is three moves: switch to main, merge the branch, delete the branch. The commits stay in main's history.",
      },
      setup: [
        ...base,
        "git switch -c newsletter",
        'echo "<form>Subscribe</form>" > newsletter.html',
        "git add .",
        'git commit -m "Add newsletter form"',
        "git switch main",
        'echo "robots: allow" > robots.txt',
        "git add .",
        'git commit -m "Add robots file"',
        "git switch newsletter",
      ],
      goals: [
        goals.onBranch("main", "End up on main"),
        goals.committedFile("newsletter.html", "main has the newsletter form"),
        goals.committedFile("robots.txt", "…and still has robots.txt"),
        goals.custom("branch-gone", "The newsletter branch is deleted", ({ state }) => state.initialized && !Object.hasOwn(state.branches, "newsletter")),
      ],
      hints: ["You're on newsletter, but main should receive the work.", "git switch main, then git merge newsletter, then git branch -d newsletter"],
      solution: ["git switch main", "git merge newsletter", "git branch -d newsletter"],
      xp: 75,
    },
  ],
};
