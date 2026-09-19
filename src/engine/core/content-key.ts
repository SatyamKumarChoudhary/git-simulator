import { hashString } from "./utils";

/** A short, stable fingerprint of file contents (like a tiny blob id). */
export function contentKey(content: string): string {
  return hashString(content).slice(0, 8);
}
