import type { EngineEvent, RepoState } from "@/engine";

/** One step of playback: the events that just happened. A new id means "animate this". */
export interface ScenePulse {
  id: number;
  events: EngineEvent[];
}

export interface SceneProps {
  repo: RepoState;
  pulse: ScenePulse;
  compact?: boolean;
  onCommitClick?: (id: string) => void;
}
