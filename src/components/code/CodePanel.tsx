import type { ReactNode } from "react";
import { CodeTabs, type CodePane } from "@/components/code/CodeTabs";
import { highlight, type Token } from "@/components/code/highlight";
import type { SnippetLang, Snippets } from "@/components/code/snippets";

const LABELS: Record<SnippetLang, string> = {
  curl: "curl",
  python: "Python",
  node: "Node",
};

const TOKEN_CLASS: Record<Exclude<Token["type"], "plain">, string> = {
  string: "text-syntax-string",
  key: "text-amber",
  keyword: "text-amber",
  comment: "text-fg-2",
};

/** Highlighting happens here, on the server, so the client gets plain spans. */
function Code({ text, lang }: { text: string; lang: SnippetLang }) {
  return (
    <pre className="m-0 w-max min-w-full px-4 py-4 font-mono text-code whitespace-pre text-fg md:px-5 md:py-5">
      <code>
        {highlight(text, lang).map((t, i) =>
          t.type === "plain" ? (
            t.text
          ) : (
            <span key={i} data-token={t.type} className={TOKEN_CLASS[t.type]}>
              {t.text}
            </span>
          ),
        )}
      </code>
    </pre>
  );
}

/**
 * The three highlighted panes (curl, Python, Node). Exported so other client
 * shells, like the hero terminal, get the same server-rendered code.
 */
export function codePanes(snippets: Snippets): CodePane[] {
  return (["curl", "python", "node"] as const).map((lang) => ({
    lang,
    label: LABELS[lang],
    text: snippets[lang],
    content: <Code text={snippets[lang]} lang={lang} />,
  }));
}

/**
 * Tabbed request example (curl, Python, Node) with a copy button.
 * A Server Component: it renders the highlighted code and hands it to the
 * small client component that owns the tab state.
 */
export function CodePanel({
  snippets,
  footer,
  defaultTab = "curl",
}: {
  snippets: Snippets;
  footer?: ReactNode;
  defaultTab?: SnippetLang;
}) {
  return <CodeTabs panes={codePanes(snippets)} defaultTab={defaultTab} footer={footer} />;
}
