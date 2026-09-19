import { CommandError } from "../core/errors";

export type Connector = "&&" | ";";

export interface Redirect {
  mode: "write" | "append";
  path: string;
}

export interface CommandSegment {
  argv: string[];
  redirect: Redirect | null;
  /** The source text of this segment, e.g. `git add .` */
  raw: string;
  /** How this segment joins the previous one (null for the first). */
  connector: Connector | null;
}

type Token =
  | { kind: "word"; value: string; start: number; end: number }
  | { kind: "op"; value: Connector | ">" | ">>"; start: number; end: number };

function tokenize(line: string): Token[] {
  const tokens: Token[] = [];
  let word = "";
  let inWord = false;
  let wordStart = 0;

  const flush = (end: number) => {
    if (!inWord) return;
    tokens.push({ kind: "word", value: word, start: wordStart, end });
    word = "";
    inWord = false;
  };
  const beginWord = (at: number) => {
    if (inWord) return;
    inWord = true;
    wordStart = at;
  };

  let i = 0;
  while (i < line.length) {
    const ch = line[i];

    if (ch === '"' || ch === "'") {
      beginWord(i);
      const quote = ch;
      let closed = false;
      i++;
      while (i < line.length) {
        const c = line[i];
        if (c === quote) {
          closed = true;
          i++;
          break;
        }
        if (quote === '"' && c === "\\" && (line[i + 1] === '"' || line[i + 1] === "\\")) {
          word += line[i + 1];
          i += 2;
          continue;
        }
        word += c;
        i++;
      }
      if (!closed) {
        throw new CommandError(
          `syntax error: unclosed ${quote === '"' ? "double" : "single"} quote`,
          "Every opening quote needs a matching closing quote, like: git commit -m \"My message\"",
        );
      }
      continue;
    }
    if (/\s/.test(ch)) {
      flush(i);
      i++;
      continue;
    }
    if (ch === "&" && line[i + 1] === "&") {
      flush(i);
      tokens.push({ kind: "op", value: "&&", start: i, end: i + 2 });
      i += 2;
      continue;
    }
    if (ch === ";") {
      flush(i);
      tokens.push({ kind: "op", value: ";", start: i, end: i + 1 });
      i++;
      continue;
    }
    if (ch === ">") {
      flush(i);
      const append = line[i + 1] === ">";
      tokens.push({ kind: "op", value: append ? ">>" : ">", start: i, end: i + (append ? 2 : 1) });
      i += append ? 2 : 1;
      continue;
    }
    if (ch === "|") {
      throw new CommandError(
        "syntax error: pipes (|) aren't supported in this simulator",
        "Run commands one at a time, or chain them with && instead.",
      );
    }
    beginWord(i);
    word += ch;
    i++;
  }
  flush(line.length);
  return tokens;
}

function parseLine(line: string, firstConnector: Connector | null): CommandSegment[] {
  const tokens = tokenize(line);
  const segments: CommandSegment[] = [];
  let argv: string[] = [];
  let redirect: Redirect | null = null;
  let connector = firstConnector;
  let start = -1;
  let end = 0;

  const close = (op: Connector | null) => {
    if (argv.length === 0) {
      if (op === "&&" || redirect) {
        throw new CommandError(`syntax error near unexpected token \`${op ?? ">"}'`, "There's a command missing around the && or >.");
      }
      return;
    }
    segments.push({ argv, redirect, raw: line.slice(start, end).trim(), connector });
    argv = [];
    redirect = null;
    start = -1;
  };

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.kind === "word") {
      if (start === -1) start = token.start;
      end = token.end;
      argv.push(token.value);
      continue;
    }
    if (token.value === ">" || token.value === ">>") {
      if (start === -1) start = token.start;
      const target = tokens[i + 1];
      if (!target || target.kind !== "word" || target.value === "") {
        throw new CommandError("syntax error near unexpected token `newline'", "Tell the shell which file to write to, like: echo \"hi\" > notes.txt");
      }
      redirect = { mode: token.value === ">>" ? "append" : "write", path: target.value };
      end = target.end;
      i++;
      continue;
    }
    // && or ;
    const op: Connector = token.value;
    close(op);
    if (op === "&&" && i === tokens.length - 1) {
      throw new CommandError("syntax error: unexpected end of input after `&&'", "Add another command after &&, or remove it.");
    }
    connector = op;
    start = -1;
  }
  close(null);
  return segments;
}

/** Splits user input (possibly multi-line) into simple command segments. */
export function parseCommandLine(input: string): CommandSegment[] {
  const segments: CommandSegment[] = [];
  for (const rawLine of input.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    segments.push(...parseLine(line, segments.length > 0 ? ";" : null));
  }
  return segments;
}
