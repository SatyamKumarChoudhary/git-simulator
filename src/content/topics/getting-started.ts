import { tryResolveRevision } from "@/engine";
import { goals } from "../goals";
import { defineTopic } from "../registry";

const site = ['echo "<h1>My Site</h1>" > index.html', 'echo "h1 { color: hotpink; }" > style.css'];

export const gettingStartedTopic = defineTopic({
  id: "getting-started",
  title: "Git basics",
  emoji: "🌱",
  tagline: "Your first repository, your first commits, and reading history",
  theme: "emerald",
  levels: [
    {
      id: "start-tracking",
      title: "Start tracking",
      mission: "You're building a tiny website. The folder has two files, but nothing is remembering your work yet. Turn this folder into a Git repository.",
      concept: {
        title: "Repository",
        body: "A repository is a project folder that Git watches. git init gives the folder a memory (a hidden .git folder) so Git can start saving snapshots.",
      },
      setup: site,
      goals: [goals.initialized("Turn the folder into a Git repository")],
      hints: ["There is one command that starts everything.", "Type: git init"],
      solution: ["git init"],
      xp: 20,
    },
    {
      id: "ask-git",
      title: "Ask Git what's going on",
      mission: "Git is watching the folder now. Ask Git what it sees — which files are new and not saved yet?",
      concept: {
        title: "git status",
        body: "git status is your best friend. It tells you which files changed, which are ready to be saved, and which Git isn't tracking yet.",
      },
      setup: [...site, "git init"],
      goals: [goals.ranCommand("git status", "Check the status (git status)")],
      hints: ["The command is named after what you want to see: the status.", "Type: git status"],
      solution: ["git status"],
      xp: 20,
    },
    {
      id: "stage-fright",
      title: "Stage one file",
      mission: "Your homepage is ready, but the stylesheet is still an experiment. Put only index.html into the staging area, so it will be part of the next save.",
      concept: {
        title: "Staging area",
        body: "Git doesn't save everything automatically. You choose what goes into the next snapshot by staging it with git add — like packing a box before you seal it.",
      },
      setup: [...site, "git init"],
      goals: [goals.staged("index.html", "Stage index.html"), goals.untrackedOnDisk("style.css", "Leave style.css unstaged")],
      hints: ["git add takes the name of the file to stage.", "Type: git add index.html"],
      solution: ["git add index.html"],
      xp: 30,
    },
    {
      id: "stage-two",
      title: "Stage two, skip one",
      phase: "practice",
      mission: "The site now has a notes file you don't want in the project. Stage index.html and style.css — both in one command — and leave notes.txt alone.",
      concept: {
        title: "Several files at once",
        body: "git add takes as many file names as you like: git add one.txt two.txt. Only what you stage ends up in the next commit.",
      },
      setup: [...site, 'echo "buy milk" > notes.txt', "git init"],
      goals: [
        goals.staged("index.html", "Stage index.html"),
        goals.staged("style.css", "Stage style.css"),
        goals.untrackedOnDisk("notes.txt", "Leave notes.txt out"),
      ],
      hints: ["You can list both names after git add.", "Type: git add index.html style.css"],
      solution: ["git add index.html style.css"],
      xp: 30,
    },
    {
      id: "first-commit",
      title: "Your first commit",
      mission: "index.html is staged and waiting. Save it as your very first commit, with a short message that says what you did.",
      concept: {
        title: "Commit",
        body: "A commit is a saved snapshot of everything in the staging area, plus a message. It becomes permanent history you can always come back to.",
      },
      setup: [...site, "git init", "git add index.html"],
      goals: [goals.commitCount(1, "Make your first commit"), goals.committedFile("index.html", "index.html is saved in it")],
      hints: ["git commit saves the staged files. Add a message with -m.", 'Type: git commit -m "Add homepage"'],
      solution: ['git commit -m "Add homepage"'],
      xp: 30,
    },
    {
      id: "commit-again",
      title: "Around the loop again",
      phase: "practice",
      mission: "The homepage is saved, but style.css still isn't. Do the same two steps again for it: stage it, then commit it.",
      concept: {
        title: "add → commit",
        body: "Every save is the same two steps: git add what you want to keep, then git commit to store it. You'll do this hundreds of times.",
      },
      setup: [...site, "git init", "git add index.html", 'git commit -m "Add homepage"'],
      goals: [goals.focusedCommit(["style.css"], "Commit style.css on its own"), goals.exactCommitCount("main", 2, "Exactly 2 commits now"), goals.cleanTree("Nothing is left unsaved")],
      hints: ["Stage it first: git add style.css", 'Then save it: git commit -m "Add styles"'],
      solution: ["git add style.css", 'git commit -m "Add styles"'],
      xp: 35,
    },
    {
      id: "save-everything",
      title: "Save everything at once",
      mission: "style.css and a new about.html are still unsaved. Stage every file in one go and commit them, so nothing is left behind.",
      concept: {
        title: "git add .",
        body: 'The dot means "everything in this folder". git add . stages all new and changed files at once.',
      },
      setup: [...site, "git init", "git add index.html", 'git commit -m "Add homepage"', 'echo "<h1>About me</h1>" > about.html'],
      goals: [goals.committedFile("style.css", "style.css is committed"), goals.committedFile("about.html", "about.html is committed"), goals.cleanTree("Nothing is left unsaved")],
      hints: ["Stage everything with a single dot: git add .", 'Then commit: git commit -m "Add styles and about page"'],
      solution: ["git add .", 'git commit -m "Add styles and about page"'],
      xp: 35,
    },
    {
      id: "sign-your-work",
      title: "Sign your work",
      mission: "Every commit records who made it. Tell Git your name and email, then commit the README change that is already staged.",
      concept: {
        title: "git config",
        body: "git config user.name and user.email set the name stamped on your commits, so your team knows who changed what.",
      },
      setup: ['echo "# My Site" > README.md', "git init", "git add .", 'git commit -m "Add readme"', 'edit README.md "Made with love"', "git add README.md"],
      goals: [
        goals.configured("user.name", "Set your name"),
        goals.configured("user.email", "Set your email"),
        goals.authoredCommit("Commit the change under your name"),
      ],
      hints: ['Set your name: git config user.name "Your Name"', 'Then your email (git config user.email "you@example.com") and commit: git commit -m "Update readme"'],
      solution: ['git config user.name "Ada"', 'git config user.email "ada@example.com"', 'git commit -m "Update readme"'],
      xp: 35,
    },
    {
      id: "check-then-commit",
      title: "Check, then save",
      phase: "practice",
      mission: "Two files are staged and a third, notes.txt, is not. Check what Git is about to save, add the missing file, and commit all three together.",
      concept: {
        title: "Status before commit",
        body: "git status is the habit that prevents surprises: it lists what is staged, what is changed but unstaged, and what Git isn't tracking at all.",
      },
      setup: [...site, 'echo "buy milk" > notes.txt', "git init", "git add index.html style.css"],
      goals: [
        goals.ranCommand("git status", "Check what's staged (git status)"),
        goals.committedFile("notes.txt", "notes.txt is in the commit"),
        goals.committedFile("index.html", "…and so is index.html"),
        goals.cleanTree("Nothing is left unsaved"),
      ],
      hints: ["Look first: git status", 'Then add the missing file and commit: git add notes.txt, git commit -m "First version"'],
      solution: ["git status", "git add notes.txt", 'git commit -m "First version"'],
      xp: 35,
    },
    {
      id: "config-again",
      title: "A second computer",
      phase: "practice",
      mission: "You're setting up a fresh repository on another machine. Tell Git who you are again, then commit the file that's already staged.",
      concept: {
        title: "Settings live per repository",
        body: "Without --global, git config saves the setting inside this repository only — which is why a new project can start without a name until you set one.",
      },
      setup: ['echo "print(1)" > main.py', "git init", "git add ."],
      goals: [
        goals.configured("user.name", "Set your name"),
        goals.configured("user.email", "Set your email"),
        goals.authoredCommit("Commit under your name"),
      ],
      hints: ['git config user.name "Your Name" and git config user.email "you@example.com"', 'Then commit: git commit -m "Add main script"'],
      solution: ['git config user.name "Grace"', 'git config user.email "grace@example.com"', 'git commit -m "Add main script"'],
      xp: 40,
    },
    {
      id: "read-history",
      title: "Read the history",
      mission: "This project already has three commits. Use the history to find the very first one, then open that commit to see what it contained.",
      concept: {
        title: "git log",
        body: "git log lists commits from newest to oldest. Every commit has a unique id — its first seven characters are enough to name it. git show <id> opens one.",
      },
      setup: [
        ...site,
        "git init",
        "git add .",
        'git commit -m "First version"',
        'edit index.html "<p>Welcome</p>"',
        'git commit -am "Add welcome text"',
        'edit style.css "p { margin: 0; }"',
        'git commit -am "Tidy spacing"',
      ],
      goals: [
        goals.ranCommand("git log", "Read the history (git log)"),
        goals.custom(
          "show-first",
          "Open the very first commit (git show <id>)",
          ({ initial, commands }) => {
            const root = Object.values(initial.commits).find((commit) => commit.parents.length === 0);
            return commands.some((command) => {
              const revision = /^git show\s+(\S+)/.exec(command.trim())?.[1];
              return !!root && !!revision && tryResolveRevision(initial, revision) === root.id;
            });
          },
          true,
        ),
      ],
      hints: ["git log --oneline shows one commit per line with a short id. The first commit is at the bottom.", "Copy that id and open it: git show <id>"],
      solution: ["git log --oneline", "git show {{rev:HEAD~2}}"],
      xp: 40,
    },
    {
      id: "checkpoint-first-repo",
      title: "Checkpoint: a repo from scratch",
      phase: "checkpoint",
      mission: "A brand-new recipe site: two files, no Git yet. Do the whole journey yourself — make it a repository, stage both files and save them in one commit. No hints needed, you've done every step.",
      concept: {
        title: "The whole loop",
        body: "init once per project, then add and commit as often as you like. Those three commands cover most days of Git.",
      },
      setup: ['echo "<h1>Recipes</h1>" > index.html', 'echo "body { font: 16px sans-serif; }" > style.css'],
      goals: [
        goals.initialized("Make it a repository"),
        goals.commitCount(1, "Make one commit"),
        goals.committedFile("index.html", "index.html is in it"),
        goals.committedFile("style.css", "…and so is style.css"),
        goals.cleanTree("Nothing is left unsaved"),
      ],
      hints: ["Three commands, in the order you learned them.", 'git init, then git add ., then git commit -m "First version"'],
      solution: ["git init", "git add .", 'git commit -m "First version"'],
      xp: 50,
    },
  ],
});
