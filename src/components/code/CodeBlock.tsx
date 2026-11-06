import { Code } from "@/components/code/CodePanel";
import { CopyButton } from "@/components/code/CopyButton";
import type { SnippetLang } from "@/components/code/snippets";

/**
 * One snippet in the same panel as CodePanel, without tabs: a terminal
 * command, a JSON response, a stream of events. A Server Component, so the
 * highlighting happens at build time; only the copy button is client code.
 *
 * `lang` picks the tokenizer: "curl" for shell, "node" for JSON and event
 * lines (it reads quoted keys and strings), "python" for Python.
 */
export function CodeBlock({
  code,
  lang,
  label,
}: {
  code: string;
  lang: SnippetLang;
  /** What the block is, in the bar above it: "Terminal", "Response". */
  label: string;
}) {
  // A fenced block in MDX ends with a newline the reader should not copy.
  const text = code.replace(/\n$/, "");
  return (
    <div data-testid="code-block" className="overflow-hidden rounded-panel border border-line bg-surface">
      <div className="flex items-center justify-between gap-2 border-b border-line bg-surface-2 min-h-11 pr-2 pl-4">
        <span className="label-mono text-fg-2">{label}</span>
        <CopyButton text={text} />
      </div>
      {/* tabIndex: a region that scrolls sideways has to be reachable by keyboard. */}
      <div
        role="region"
        aria-label={`${label} code`}
        tabIndex={0}
        className="overflow-x-auto focus-visible:outline-offset-[-3px]"
      >
        <Code text={text} lang={lang} />
      </div>
    </div>
  );
}
