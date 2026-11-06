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
export function Code({ text, lang }: { text: string; lang: SnippetLang }) {
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
export function codePanes(snippets: Partial<Snippets>): CodePane[] {
  return (["curl", "python", "node"] as const).flatMap((lang) => {
    const text = snippets[lang];
    if (text === undefined) return [];
    return [{ lang, label: LABELS[lang], text, content: <Code text={text} lang={lang} /> }];
  });
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
  syncLanguage = false,
}: {
  /** Only the languages given get a tab (an install command has no curl). */
  snippets: Partial<Snippets>;
  footer?: ReactNode;
  defaultTab?: SnippetLang;
  /** Docs pages: keep every synced panel on the language the reader last picked. */
  syncLanguage?: boolean;
}) {
  return (
    <CodeTabs
      panes={codePanes(snippets)}
      defaultTab={defaultTab}
      footer={footer}
      syncLanguage={syncLanguage}
    />
  );
}
