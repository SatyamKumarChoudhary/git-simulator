import { goals } from "../goals";
import { defineTopic } from "../registry";

const URL = "https://github.com/team/website";

const hosted = [
  `server create ${URL}`,
  `server commit ${URL} "Initial commit" --file README.md --content "# Website"`,
  `server commit ${URL} "Add homepage" --file index.html --content "<h1>Welcome</h1>"`,
];
const cloned = [...hosted, `git clone ${URL}`];

const serverTip = (state: { servers: Record<string, { branches: Record<string, string> }> }, branch = "main") => state.servers[URL]?.branches[branch];

export const teamworkTopic = defineTopic({
  id: "teamwork",
  title: "Working with a team",
  emoji: "🤝",
  tagline: "Branches on GitHub, and keeping up with everyone else",
  theme: "indigo",
  levels: [
    {
      id: "remote-branches",
      title: "Join a teammate's branch",
      mission: "A teammate published a branch called design. Fetch what's new, look at the list of branches GitHub has, then switch onto design to help out.",
      concept: {
        title: "Remote-tracking branches",
        body: "git branch -r lists the branches Git knows GitHub has, like origin/design. Switching to that name creates your own copy, already linked to theirs.",
      },
      setup: [...cloned, `server commit ${URL} "Start redesign" --file design.css --content "body { font: 18px serif; }" --branch design`],
      goals: [
        goals.custom("fetched", "Fetch what GitHub has", ({ state }) => state.remoteRefs["origin/design"] === serverTip(state, "design"), true),
        goals.custom(
          "listed",
          "List the branches GitHub has (git branch -r)",
          ({ commands }) => commands.some((command) => /^git branch\s+(-r|--remotes|-a|--all)\b/.test(command.trim())),
          true,
        ),
        goals.onBranch("design", "Switch onto design"),
        goals.upstream("design", "origin/design", "It's linked to origin/design"),
      ],
      hints: ["Download what's new first: git fetch", "See what GitHub has: git branch -r", "Then switch to it by name: git switch design"],
      solution: ["git fetch", "git branch -r", "git switch design"],
      xp: 70,
    },
    {
      id: "publish-branch",
      title: "Publish a branch",
      mission: "You built a dark mode on a new branch. Publish the dark-mode branch to GitHub, and link it so future git push and git pull just work.",
      concept: {
        title: "git push -u",
        body: "The first push of a new branch says where it goes. -u links your branch to the remote one, so next time a plain git push is enough.",
      },
      setup: [...cloned, "git switch -c dark-mode", 'echo "body { background: #111; }" > dark.css', "git add .", 'git commit -m "Dark mode"'],
      goals: [
        goals.serverMatches(URL, "dark-mode", "GitHub has the dark-mode branch"),
        goals.upstream("dark-mode", "origin/dark-mode", "dark-mode is linked to origin/dark-mode"),
      ],
      hints: ["A plain git push fails here: the branch doesn't exist on GitHub yet.", "Type: git push -u origin dark-mode"],
      solution: ["git push -u origin dark-mode"],
      xp: 80,
    },
    {
      id: "push-again",
      title: "Push again, the short way",
      phase: "practice",
      mission: "Your search branch is already on GitHub and linked to it. You've just committed one more change — send it up with the shortest command that works.",
      concept: {
        title: "Why -u was worth it",
        body: "Because the branch is linked to origin/search, Git already knows where a plain git push should go. You only need -u the first time.",
      },
      setup: [
        ...cloned,
        "git switch -c search",
        'echo "searchBox()" > search.js',
        "git add .",
        'git commit -m "Add search box"',
        "git push -u origin search",
        'edit search.js "showResults()"',
        'git commit -am "Show results"',
      ],
      goals: [
        goals.serverMatches(URL, "search", "GitHub has your newest commit"),
        goals.custom("nothing-ahead", "Nothing left to push", ({ state }) => state.branches.search === state.remoteRefs["origin/search"]),
      ],
      hints: ["The branch is already linked, so no remote or branch name is needed.", "Type: git push"],
      solution: ["git push"],
      xp: 75,
    },
    {
      id: "push-rejected",
      title: "Push rejected!",
      mission: "Try to push your blog commit. GitHub refuses, because a teammate pushed something you don't have. Bring their work in, then push again.",
      concept: {
        title: "Rejected push",
        body: "Git won't let a push throw away commits already on the remote. Pull first to combine both sets of work, then push.",
      },
      setup: [...cloned, 'echo "<h1>Blog</h1>" > blog.html', "git add .", 'git commit -m "Add blog"', `server commit ${URL} "Add contact info" --file contact.md --content "Email us"`],
      goals: [
        goals.serverHasFile(URL, "main", "blog.html", "GitHub has your blog"),
        goals.serverHasFile(URL, "main", "contact.md", "…and still has your teammate's work"),
        goals.serverMatches(URL, "main", "Your main and GitHub match"),
      ],
      hints: ["When a push is rejected, get the new commits first: git pull", "Now there's nothing in the way: git push"],
      solution: ["git pull", "git push"],
      xp: 75,
    },
    {
      id: "publish-second-branch",
      title: "Publish another branch",
      phase: "practice",
      mission: "The fix you made on the hotfix branch needs to be on GitHub for review. Publish hotfix and link it, the same way you published the last one.",
      concept: {
        title: "Every new branch needs -u once",
        body: "The link is per branch: each brand-new branch gets one git push -u, and every push after that is just git push.",
      },
      setup: [...cloned, "git switch -c hotfix", 'echo "fix()" > fix.js', "git add .", 'git commit -m "Fix the crash"'],
      goals: [
        goals.serverMatches(URL, "hotfix", "GitHub has the hotfix branch"),
        goals.upstream("hotfix", "origin/hotfix", "hotfix is linked to origin/hotfix"),
      ],
      hints: ["A plain push won't know where to put a brand-new branch.", "Type: git push -u origin hotfix"],
      solution: ["git push -u origin hotfix"],
      xp: 80,
    },
    {
      id: "pull-then-work",
      title: "Start the day with a pull",
      phase: "practice",
      mission: "Morning routine: get whatever the team pushed overnight, then commit your own change and share it.",
      concept: {
        title: "Pull, work, push",
        body: "Pulling first means your commit sits on top of everyone else's work, so your push is never rejected.",
      },
      setup: [
        ...cloned,
        `server commit ${URL} "Overnight fix" --file index.html --content "<h1>Welcome back</h1>"`,
        'echo "<h1>Team</h1>" > team.html',
      ],
      goals: [
        goals.containsMessage("main", "Overnight fix", "You have the overnight commit"),
        goals.serverHasFile(URL, "main", "team.html", "GitHub has your new page"),
        goals.serverMatches(URL, "main", "Your main and GitHub match"),
      ],
      hints: ["Get their work first: git pull", 'Then git add team.html, git commit -m "Add team page", and git push'],
      solution: ["git pull", "git add team.html", 'git commit -m "Add team page"', "git push"],
      xp: 85,
    },
    {
      id: "clone-again",
      title: "Clone the second repo",
      phase: "practice",
      mission: "The team's design assets live in their own repository at https://github.com/team/assets. Get a copy onto this machine.",
      concept: {
        title: "One clone per project",
        body: "Every project is its own repository with its own history. Cloning a second one gives you a separate folder with its own origin.",
      },
      setup: [
        "server create https://github.com/team/assets",
        'server commit https://github.com/team/assets "Add logo" --file logo.svg --content "<svg>logo</svg>"',
        'server commit https://github.com/team/assets "Add colours" --file colours.css --content ":root { --brand: hotpink; }"',
      ],
      goals: [
        goals.remoteNamed("origin", "https://github.com/team/assets", "Clone the assets repository"),
        goals.committedFile("colours.css", "You have the colours file"),
        goals.containsMessage("main", "Add logo", "…and the whole history"),
      ],
      hints: ["Same command as the first time, different address.", "Type: git clone https://github.com/team/assets"],
      solution: ["git clone https://github.com/team/assets"],
      xp: 70,
    },
    {
      id: "checkpoint-remotes",
      title: "Checkpoint: a day with the team",
      phase: "checkpoint",
      mission:
        "You finished an FAQ page on its own branch, and meanwhile a teammate pushed to main. Do the whole round trip: bring their work into your main, then publish your faq branch to GitHub with a link for next time.",
      concept: {
        title: "The team round trip",
        body: "Pull to get everyone else's work, push to share yours. A brand-new branch needs push -u once; after that, plain push and pull are enough.",
      },
      setup: [
        ...cloned,
        "git switch -c faq",
        'echo "<h1>FAQ</h1>" > faq.html',
        "git add .",
        'git commit -m "Add FAQ page"',
        `server commit ${URL} "Add pricing" --file pricing.html --content "<h1>Pricing</h1>"`,
      ],
      goals: [
        goals.custom("main-updated", "Your main has the teammate's commit", ({ state }) => !!serverTip(state) && state.branches.main === serverTip(state)),
        goals.serverHasFile(URL, "faq", "faq.html", "GitHub has your faq branch"),
        goals.upstream("faq", "origin/faq", "faq is linked to origin/faq"),
      ],
      hints: [
        "Their work belongs on main, so go there first: git switch main, then git pull",
        "Then publish your branch: git switch faq, then git push -u origin faq",
      ],
      solution: ["git switch main", "git pull", "git switch faq", "git push -u origin faq"],
      xp: 90,
    },
  ],
});
