export type Tone =
  | "default"
  | "muted"
  | "success"
  | "error"
  | "warning"
  | "info"
  | "accent"
  | "added"
  | "removed"
  | "branch"
  | "head"
  | "tag"
  | "hash"
  | "heading";

export interface Segment {
  text: string;
  tone?: Tone;
  bold?: boolean;
}

export interface OutputLine {
  segments: Segment[];
}

export function seg(text: string, tone?: Tone, bold?: boolean): Segment {
  return bold ? { text, tone, bold } : { text, tone };
}

export function lineOf(text: string, tone?: Tone): OutputLine {
  return { segments: [seg(text, tone)] };
}

export function linesOf(text: string, tone?: Tone): OutputLine[] {
  return text.split("\n").map((part) => lineOf(part, tone));
}

export function plainText(line: OutputLine): string {
  return line.segments.map((segment) => segment.text).join("");
}
