import { goals } from "../goals";
import type { WorldDefinition } from "../types";

const URL = "https://github.com/team/website";
const SHOP = "https://github.com/team/shop";

const hosted = [
  `server create ${URL}`,
  `server commit ${URL} "Initial commit" --file README.md --content "# Website"`,
  `server commit ${URL} "Add homepage" --file index.html --content "<h1>Welcome</h1>"`,
];
const cloned = [...hosted, `git clone ${URL}`];

const serverTip = (state: { servers: Record<string, { branches: Record<string, string> }> }, branch = "main") => state.servers[URL]?.branches[branch];

export const remotesWorld: WorldDefinition = {
  id: "remotes",
  title: "Remote repository",
  emoji: "☁️",
  tagline: "Put your project on GitHub and keep it in sync",
  theme: "indigo",
  levels: [
    {
      id: "clone",
      title: "Clone a project",
      mission: `Your team's website lives on GitHub at ${URL}. Download a full copy, with all its history, into this empty folder.`,
      concept: {
        title: "Remote",
        body: "A remote is a copy of the repository on a server like GitHub. git clone downloads it and remembers where it came from as 'origin'.",
      },
      setup: hosted,
      goals: [
        goals.remoteNamed("origin", URL, "Clone the repository"),
        goals.containsMessage("main", "Add homepage", "You have the team's commits"),
      ],
      hints: ["git clone downloads a repository from its URL.", `Type: git clone ${URL}`],
      solution: [`git clone ${URL}`],
      xp: 60,
    },
    {
      id: "push",
      title: "Share your work",
      mission: "You created an About page. Commit it, then push it to GitHub so your team can see it.",
      concept: {
        title: "git push",
        body: "git push uploads your new commits to the remote. origin/main moves too, showing what GitHub now has.",
      },
      setup: [...cloned, 'echo "<h1>About us</h1>" > about.html'],
      goals: [
        goals.committedFile("about.html", "Commit about.html"),
        goals.serverHasFile(URL, "main", "about.html", "GitHub has about.html"),
      ],
      hints: ['Commit it first: git add . then git commit -m "Add about page"', "Upload it: git push"],
      solution: ["git add .", 'git commit -m "Add about page"', "git push"],
      xp: 65,
    },
    {
      id: "fetch",
      title: "See what your team did",
      mission: "A teammate pushed a commit to GitHub. Fetch it first (watch origin/main move while your main stays put), then merge it into main.",
      concept: {
        title: "git fetch",
        body: "fetch downloads new commits and moves origin/main — but leaves your own branches alone, so you can look before you merge.",
      },
      setup: [...cloned, `server commit ${URL} "Update README" --file README.md --content "# Website\\nNow with docs"`],
      goals: [
        goals.custom("fetched", "Fetch the new commit", ({ state }) => !!serverTip(state) && state.remoteRefs["origin/main"] === serverTip(state), true),
        goals.custom("merged", "Merge it into main", ({ state }) => !!serverTip(state) && state.branches.main === serverTip(state)),
      ],
      hints: ["git fetch downloads new commits without changing your branches.", "Then bring them into main: git merge origin/main"],
      solution: ["git fetch", "git merge origin/main"],
      xp: 65,
    },
    {
      id: "pull",
      title: "Pull in one step",
      phase: "practice",
      mission: "Two more commits landed on GitHub. This time get them into your main with a single command.",
      concept: {
        title: "git pull",
        body: "git pull is fetch and merge in one go: it downloads new commits and merges them into your current branch.",
      },
      setup: [...cloned, `server commit ${URL} "Add blog" --file blog.html --content "<h1>Blog</h1>"`, `server commit ${URL} "Add contact" --file contact.html --content "Email us"`],
      goals: [
        goals.custom("up-to-date", "main has the new commits", ({ state }) => !!serverTip(state) && state.branches.main === serverTip(state)),
        goals.cleanTree("Nothing is left unsaved"),
      ],
      hints: ["pull = fetch + merge.", "Type: git pull"],
      solution: ["git pull"],
      xp: 65,
    },
    {
      id: "connect-remote",
      title: "Connect your project to GitHub",
      mission: "Your shop only exists on this computer. An empty repository is waiting at https://github.com/team/shop. Add it as the remote called origin, then push main so the code is finally online.",
      concept: {
        title: "git remote add",
        body: "git remote add origin <url> tells your repository where its home on GitHub is. 'origin' is just the usual nickname for that address. The first push also links your branch to it with -u.",
      },
      setup: [
        `server create ${SHOP}`,
        'echo "# Shop" > README.md',
        "git init",
        "git add .",
        'git commit -m "Initial commit"',
        'echo "<h1>Shop</h1>" > index.html',
        "git add .",
        'git commit -m "Add homepage"',
      ],
      goals: [
        goals.remoteNamed("origin", SHOP, "Add origin"),
        goals.serverMatches(SHOP, "main", "GitHub has your main branch"),
        goals.upstream("main", "origin/main", "main is linked to origin/main"),
      ],
      hints: [`Point your repo at the address: git remote add origin ${SHOP}`, "Then send it up and link the branch: git push -u origin main"],
      solution: [`git remote add origin ${SHOP}`, "git push -u origin main"],
      xp: 70,
    },
    {
      id: "default-branch",
      title: "Rename the default branch",
      phase: "practice",
      mission: "This old project still calls its default branch master, and the team uses main. Rename it to main, then push it to GitHub and link it.",
      concept: {
        title: "git branch -M main",
        body: "-M renames a branch even if the new name is taken. Older repositories start on 'master'; most teams now use 'main', so this rename is the first thing you do.",
      },
      setup: [
        `server create ${SHOP}`,
        'echo "# Shop" > README.md',
        "git init",
        "git branch -m main master",
        "git add .",
        'git commit -m "Initial commit"',
        `git remote add origin ${SHOP}`,
      ],
      goals: [
        goals.onBranch("main", "You're on a branch called main"),
        goals.custom("master-gone", "There's no master branch any more", ({ state }) => state.initialized && !Object.hasOwn(state.branches, "master")),
        goals.serverMatches(SHOP, "main", "GitHub has main"),
      ],
      hints: ["Rename the branch you're on: git branch -M main", "Then publish it: git push -u origin main"],
      solution: ["git branch -M main", "git push -u origin main"],
      xp: 70,
    },
    {
      id: "remote-check",
      title: "Where does this push go?",
      phase: "practice",
      mission: "Before pushing on a machine you haven't used in a while, check which address origin actually points at.",
      concept: {
        title: "git remote -v",
        body: "git remote -v lists every remote and its URL — v is for verbose. It answers 'where would my push go?' before you find out the hard way.",
      },
      setup: [...cloned],
      goals: [goals.ranCommand("git remote -v", "List the remotes (git remote -v)")],
      hints: ["The command shows remotes with their URLs.", "Type: git remote -v"],
      solution: ["git remote -v"],
      xp: 55,
    },
    {
      id: "push-second-commit",
      title: "Push what you just fixed",
      phase: "practice",
      mission: "You've fixed a typo in the README but haven't saved it yet. Commit the fix and get it onto GitHub.",
      concept: {
        title: "Commit, then push",
        body: "push only sends commits. Anything you haven't committed stays on your machine, which is why the pair commit → push becomes second nature.",
      },
      setup: [...cloned, 'echo "# Website — the team site" > README.md'],
      goals: [
        goals.serverMatches(URL, "main", "GitHub matches your main"),
        goals.custom(
          "fix-pushed",
          "The README fix is on GitHub",
          ({ state }) => {
            const tip = state.servers[URL]?.branches.main;
            return !!tip && state.servers[URL].commits[tip].tree["README.md"] === state.workdir["README.md"];
          },
        ),
      ],
      hints: ['Save it first: git commit -am "Fix readme"', "Then send it: git push"],
      solution: ['git commit -am "Fix readme"', "git push"],
      xp: 65,
    },
    {
      id: "checkpoint-remote",
      title: "Checkpoint: publish a project",
      phase: "checkpoint",
      mission:
        "An old project on your laptop: branch still called master, no remote, and an empty repository waiting at https://github.com/team/shop. Get it online the way the team expects — branch named main, connected to origin, pushed and linked.",
      concept: {
        title: "Putting a project on GitHub",
        body: "Three steps, once per project: rename the branch to main, add the remote, then push with -u. After that, plain git push and git pull are enough.",
      },
      setup: [
        `server create ${SHOP}`,
        'echo "# Shop" > README.md',
        "git init",
        "git branch -m main master",
        "git add .",
        'git commit -m "Initial commit"',
        'echo "<h1>Shop</h1>" > index.html',
        "git add .",
        'git commit -m "Add homepage"',
      ],
      goals: [
        goals.onBranch("main", "The branch is called main"),
        goals.remoteNamed("origin", SHOP, "origin points at the GitHub repo"),
        goals.serverMatches(SHOP, "main", "GitHub has all your commits"),
        goals.upstream("main", "origin/main", "main is linked to origin/main"),
      ],
      hints: [
        "Rename first: git branch -M main",
        `Then connect it: git remote add origin ${SHOP}`,
        "Then publish and link: git push -u origin main",
      ],
      solution: ["git branch -M main", `git remote add origin ${SHOP}`, "git push -u origin main"],
      xp: 85,
    },
  ],
};