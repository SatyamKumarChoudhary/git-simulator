import type { ComponentType, ReactNode } from "react";
import type { ListEdge, ListMetrics, ListNode, Pointer } from "../linked-list/layout";

export interface GuideItem {
  visual: ReactNode;
  text: ReactNode;
}

/**
 * How a history scene looks. Every skin shares the same layout and choreography (commit born → link drawn →
 * pointers glide), so switching views never changes what the picture means — only how it is drawn.
 */
export interface SceneSkin {
  metrics: ListMetrics;
  /** Painted behind the world; does not zoom. */
  Backdrop: ComponentType;
  /** One parent link, drawn inside the scene's SVG. Delay = when a brand-new link should start drawing. */
  Link: ComponentType<{ edge: ListEdge; delay: number }>;
  /** A commit, centred on (0, 0) of its slot. */
  Commit: ComponentType<{ node: ListNode; compact: boolean; onClick?: (id: string) => void }>;
  /** A pointer (branch, tag, HEAD…), centred on (0, 0) of its slot. */
  Pill: ComponentType<{ pointer: Pointer }>;
  /** Placeholder where the first commit will appear. */
  Placeholder: ComponentType;
  /** Pointer lines end in an arrowhead; without one they read as posts (signposts). */
  pointerHeads: boolean;
  /** Corner radius of the glow around the commit HEAD is on. */
  glowRadius: string;
  /** Always paint this scene with the dark palette (e.g. outer space). */
  dark?: boolean;
  /** "How to read this" entries for the help popover. */
  guide: GuideItem[];
}
