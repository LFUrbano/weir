"use client";

import { highlight, type Token } from "@/components/code/highlight";
import { snippetsFor } from "@/components/code/snippets";
import { requestDiff, type DiffLine } from "@/lib/compare";
import { shortModelName } from "@/lib/model-display";
import { cn } from "@/lib/utils";
import { useComparePair } from "./use-compare-pair";

const TOKEN_CLASS: Record<Exclude<Token["type"], "plain">, string> = {
  string: "text-syntax-string",
  key: "text-amber",
  keyword: "text-amber",
  comment: "text-fg-2",
};

/** Highlights the whole request (the curl body is JSON), then cuts it into lines. */
function highlightedLines(code: string): Token[][] {
  const lines: Token[][] = [[]];
  for (const token of highlight(code, "curl")) {
    token.text.split("\n").forEach((part, i) => {
      if (i > 0) lines.push([]);
      if (part) lines[lines.length - 1].push({ type: token.type, text: part });
    });
  }
  return lines;
}

const LINE: Record<DiffLine["type"], { sign: string; label: string; className: string; signClass: string }> = {
  same: { sign: " ", label: "", className: "", signClass: "" },
  removed: { sign: "-", label: "Removed line: ", className: "bg-err/10", signClass: "text-err" },
  added: { sign: "+", label: "Added line: ", className: "bg-ok/10", signClass: "text-ok" },
};

/**
 * The curl request for A, turned into B's: models on one endpoint take the
 * same body, so only the "model" line changes. Removed and added lines carry
 * a "-" or "+" and a screen-reader label, not only a color.
 */
export function RequestDiff() {
  const { a, b } = useComparePair();
  const fromCurl = snippetsFor(a).curl;
  const toCurl = snippetsFor(b).curl;
  const diff = requestDiff(fromCurl, toCurl);
  const from = highlightedLines(fromCurl);
  const to = highlightedLines(toCurl);
  const changed = diff.filter((l) => l.type === "added").length;

  let ia = 0;
  let ib = 0;
  const rows = diff.map((l) => {
    let tokens: Token[];
    if (l.type === "added") tokens = to[ib++];
    else {
      tokens = from[ia++];
      if (l.type === "same") ib++;
    }
    return { ...l, tokens };
  });

  return (
    <div data-testid="request-diff" className="overflow-hidden rounded-panel border border-line bg-surface">
      <div className="flex min-h-11 items-center justify-between gap-4 border-b border-line px-4">
        <span className="font-mono text-meta text-fg-2">diff</span>
        <span className="font-mono text-meta text-fg-2">
          {changed} {changed === 1 ? "line" : "lines"} changed
        </span>
      </div>
      {/* tabIndex: a region that scrolls sideways has to be reachable by keyboard. */}
      <div
        role="region"
        aria-label={`Request for ${shortModelName(a)}, changed to ${shortModelName(b)}`}
        tabIndex={0}
        className="overflow-x-auto focus-visible:outline-offset-[-3px]"
      >
        <pre className="m-0 w-max min-w-full py-4 font-mono text-code whitespace-pre text-fg md:py-5">
          <code>
            {rows.map((r, i) => {
              const kind = LINE[r.type];
              return (
                <span key={i} data-diff={r.type} className={cn("block pr-5", kind.className)}>
                  <span aria-hidden="true" className={cn("inline-block w-10 pl-4 select-none", kind.signClass)}>
                    {kind.sign}
                  </span>
                  {kind.label && <span className="sr-only">{kind.label}</span>}
                  {r.tokens.map((t, j) =>
                    t.type === "plain" ? (
                      t.text
                    ) : (
                      <span key={j} className={TOKEN_CLASS[t.type]}>
                        {t.text}
                      </span>
                    ),
                  )}
                  {"\n"}
                </span>
              );
            })}
          </code>
        </pre>
      </div>
    </div>
  );
}
