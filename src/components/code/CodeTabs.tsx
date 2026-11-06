"use client";

import { useState, type ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CopyButton } from "@/components/code/CopyButton";
import { useSharedLang } from "@/components/code/lang-store";
import type { SnippetLang } from "@/components/code/snippets";

export interface CodePane {
  lang: SnippetLang;
  label: string;
  /** Plain snippet text, exactly what the copy button puts on the clipboard. */
  text: string;
  /** The same snippet, highlighted on the server. */
  content: ReactNode;
}

/** Client half of CodePanel: tab state and the copy button, nothing else. */
export function CodeTabs({
  panes,
  defaultTab,
  footer,
  syncLanguage = false,
}: {
  panes: CodePane[];
  defaultTab: SnippetLang;
  footer?: ReactNode;
  /** Follow the language picked in the other synced panels on the page, and share this pick with them. */
  syncLanguage?: boolean;
}) {
  const [own, setOwn] = useState<SnippetLang>(defaultTab);
  const [shared, setShared] = useSharedLang();
  const wanted = syncLanguage && shared ? shared : own;
  // A panel without the wanted language (install has no curl tab) shows its first one.
  const current = panes.find((p) => p.lang === wanted) ?? panes[0];

  return (
    <div data-testid="code-panel" className="overflow-hidden rounded-panel border border-line bg-surface">
      <Tabs
        value={current.lang}
        onValueChange={(v) => {
          setOwn(v as SnippetLang);
          if (syncLanguage) setShared(v as SnippetLang);
        }}
      >
        <div className="flex items-center justify-between gap-2 border-b border-line bg-surface-2 pr-2">
          <TabsList aria-label="Language">
            {panes.map((p) => (
              <TabsTrigger key={p.lang} value={p.lang}>
                {p.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <CopyButton key={current.lang} text={current.text} />
        </div>
        {panes.map((p) => (
          <TabsContent
            key={p.lang}
            value={p.lang}
            className="overflow-x-auto focus-visible:outline-offset-[-3px]"
          >
            {p.content}
          </TabsContent>
        ))}
      </Tabs>
      {footer ? (
        <div className="border-t border-line px-4 py-3 font-mono text-[0.8125rem] text-fg-2">
          {footer}
        </div>
      ) : null}
    </div>
  );
}
