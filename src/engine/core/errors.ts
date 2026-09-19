/**
 * Thrown by commands for expected failures (bad input, refused operations).
 * `message` mimics real Git output; `hint` is a plain-English explanation for learners.
 */
export class CommandError extends Error {
  readonly hint?: string;

  constructor(message: string, hint?: string) {
    super(message);
    this.name = "CommandError";
    this.hint = hint;
  }
}
