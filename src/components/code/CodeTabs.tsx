"use client";

import { useState, type ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CopyButton } from "@/components/code/CopyButton";
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
}: {
  panes: CodePane[];
  defaultTab: SnippetLang;
  footer?: ReactNode;
}) {
  const [active, setActive] = useState<SnippetLang>(defaultTab);
  const current = panes.find((p) => p.lang === active) ?? panes[0];

  return (
    <div className="overflow-hidden rounded-panel border border-line bg-surface">
      <Tabs value={active} onValueChange={(v) => setActive(v as SnippetLang)}>
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
