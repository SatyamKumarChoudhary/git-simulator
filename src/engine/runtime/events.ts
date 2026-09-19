/**
 * Semantic events emitted by commands. The engine never renders anything —
 * the visualizer listens to these to decide which animations to play.
 */
export type CommitKind = "normal" | "root" | "merge" | "amend" | "revert" | "cherry-pick" | "rebase";

export type EngineEvent =
  | { type: "repo-init" }
  | { type: "file-written"; path: string; created: boolean }
  | { type: "file-removed"; path: string }
  | { type: "staged"; paths: string[] }
  | { type: "unstaged"; paths: string[] }
  | { type: "discarded"; paths: string[] }
  | { type: "commit"; id: string; kind: CommitKind }
  | { type: "branch-created"; name: string; at: string | null }
  | { type: "branch-deleted"; name: string }
  | { type: "branch-renamed"; from: string; to: string }
  | { type: "head-moved"; from: string | null; to: string; branch: string | null }
  | { type: "fast-forward"; ref: string; from: string; to: string }
  | { type: "merge-conflict"; paths: string[] }
  | { type: "merge-aborted" }
  | { type: "reset"; mode: "soft" | "mixed" | "hard"; from: string; to: string }
  | { type: "rebased"; branch: string | null; from: string; to: string }
  | { type: "tag-created"; name: string; at: string }
  | { type: "tag-deleted"; name: string }
  | { type: "stashed" }
  | { type: "stash-applied" }
  | { type: "remote-sync"; direction: "clone" | "fetch" | "push" | "teammate"; ref: string }
  | { type: "error"; message: string };

export type EngineEventType = EngineEvent["type"];

/** A plain-English explanation of what just happened, shown next to the visualization. */
export interface Narration {
  icon: string;
  title: string;
  body: string;
}

/** Side effects the host UI should perform (things outside the repository). */
export type Effect = { type: "clear-terminal" } | { type: "undo" };
