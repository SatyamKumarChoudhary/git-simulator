import type { CSSProperties } from "react";
import { COLORS, type ListNode, type Pointer } from "./layout";

/** Shared look of commits and pointer pills, so the board and small previews always match. */

export const nodeAccent = (node: ListNode) => (node.reachable ? node.color : "var(--c-edge-faded)");

export function nodeBorder(node: ListNode): string {
  if (node.conflicted) return COLORS.mergeHead;
  if (node.isHead) return COLORS.head;
  return `color-mix(in srgb, ${nodeAccent(node)} 55%, var(--c-node-border))`;
}

export function pillStyle(pointer: Pointer): CSSProperties {
  const solid = pointer.kind === "head" || pointer.kind === "merge";
  const dashed = pointer.kind === "remote" || pointer.kind === "stash";
  return {
    color: solid ? "#ffffff" : `color-mix(in srgb, ${pointer.color} 62%, var(--c-ink))`,
    background: solid ? pointer.color : `color-mix(in srgb, ${pointer.color} ${pointer.current ? 16 : 9}%, var(--c-node))`,
    borderColor: solid ? pointer.color : `color-mix(in srgb, ${pointer.color} ${pointer.current ? 90 : 65}%, var(--c-node-border))`,
    borderStyle: dashed ? "dashed" : "solid",
    textShadow: solid ? "0 1px 1px rgb(0 0 0 / 0.2)" : undefined,
  };
}
