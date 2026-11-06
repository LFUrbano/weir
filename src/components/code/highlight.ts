/**
 * A deliberately tiny tokenizer for the three snippet languages. It runs at
 * build time inside a Server Component, so no highlighter ships to the client.
 * It only needs to be right for the code Weir shows, and it never changes the
 * text: joining every token's `text` gives back the input exactly.
 */

export type TokenType = "plain" | "string" | "key" | "keyword" | "comment";
export type Token = { type: TokenType; text: string };
export type HighlightLang = "curl" | "python" | "node";

// Inside a curl `-d '...'` body the language is JSON.
type Mode = HighlightLang | "json";

const KEYWORDS: Record<Mode, ReadonlySet<string>> = {
  curl: new Set(["curl"]),
  python: new Set(["import", "from", "as", "True", "False", "None"]),
  node: new Set(["import", "from", "const", "let", "await", "new", "true", "false", "null"]),
  json: new Set(["true", "false", "null"]),
};

const DOUBLE = /"(?:[^"\\\n]|\\.)*"/y;
const SINGLE = /'(?:[^'\\\n]|\\.)*'/y;
const SINGLE_MULTILINE = /'[^']*'/y;
const BACKTICK = /`(?:[^`\\]|\\.)*`/y;
const WORD_START = /[A-Za-z_$]/;
const WORD = /[A-Za-z_$][\w$]*/y;
const FLAG = /--?[A-Za-z][\w-]*/y;
const NUMBER = /\d+(?:\.\d+)?/y;
const LINE_COMMENT_HASH = /#[^\n]*/y;
const LINE_COMMENT_SLASH = /\/\/[^\n]*/y;
const FOLLOWED_BY_COLON = /\s*:(?!:)/y;

function match(re: RegExp, text: string, at: number): string | null {
  re.lastIndex = at;
  const m = re.exec(text);
  return m ? m[0] : null;
}

function followedByColon(text: string, at: number): boolean {
  return match(FOLLOWED_BY_COLON, text, at) !== null;
}

function push(out: Token[], type: TokenType, text: string) {
  const last = out[out.length - 1];
  if (last && last.type === type && type !== "key" && type !== "keyword") {
    last.text += text;
  } else {
    out.push({ type, text });
  }
}

function scan(code: string, mode: Mode, out: Token[]) {
  const hashComments = mode === "curl" || mode === "python";
  const slashComments = mode === "node";
  let i = 0;

  while (i < code.length) {
    const prev = i === 0 ? "\n" : code[i - 1];
    const atWordStart = /[\s(]/.test(prev);
    const ch = code[i];

    // Comments.
    if (ch === "#" && hashComments && atWordStart) {
      const text = match(LINE_COMMENT_HASH, code, i)!;
      push(out, "comment", text);
      i += text.length;
      continue;
    }
    if (ch === "/" && slashComments) {
      const text = match(LINE_COMMENT_SLASH, code, i);
      if (text) {
        push(out, "comment", text);
        i += text.length;
        continue;
      }
    }

    // A curl single-quoted argument is a JSON body: quotes in string color,
    // the inside tokenized as JSON.
    if (ch === "'" && mode === "curl") {
      const text = match(SINGLE_MULTILINE, code, i);
      if (text) {
        push(out, "string", "'");
        scan(text.slice(1, -1), "json", out);
        push(out, "string", "'");
        i += text.length;
        continue;
      }
    }

    // Strings. A string followed by a colon is an object key.
    if (ch === '"' || ch === "'" || (ch === "`" && mode === "node")) {
      const re = ch === '"' ? DOUBLE : ch === "'" ? SINGLE : BACKTICK;
      const text = match(re, code, i);
      if (text) {
        const isKey = ch === '"' && followedByColon(code, i + text.length);
        push(out, isKey ? "key" : "string", text);
        i += text.length;
        continue;
      }
    }

    // curl flags: -H, -d, --header.
    if (ch === "-" && mode === "curl" && atWordStart) {
      const text = match(FLAG, code, i);
      if (text) {
        push(out, "keyword", text);
        i += text.length;
        continue;
      }
    }

    // Words: keywords, unquoted object keys, Python keyword arguments.
    if (WORD_START.test(ch) && !/[\w$]/.test(prev)) {
      const text = match(WORD, code, i)!;
      const end = i + text.length;
      if (KEYWORDS[mode].has(text)) {
        push(out, "keyword", text);
      } else if (mode === "node" && followedByColon(code, end)) {
        push(out, "key", text);
      } else if (mode === "python" && code[end] === "=" && code[end + 1] !== "=") {
        push(out, "key", text);
      } else {
        push(out, "plain", text);
      }
      i = end;
      continue;
    }

    // Numbers stay plain, but are consumed whole so "70b" is not split as a word.
    const num = /\d/.test(ch) && !/[\w$]/.test(prev) ? match(NUMBER, code, i) : null;
    if (num) {
      push(out, "plain", num);
      i += num.length;
      continue;
    }

    push(out, "plain", ch);
    i += 1;
  }
}

export function highlight(code: string, lang: HighlightLang): Token[] {
  const out: Token[] = [];
  scan(code, lang, out);
  return out;
}
