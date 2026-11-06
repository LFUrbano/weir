"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState, type RefObject } from "react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { models } from "@/data/models";
import { commandPages } from "@/data/site";
import { Kbd } from "./Kbd";

/**
 * The menu itself: cmdk, the Radix dialog and the model list. Loaded on
 * demand by CommandMenuProvider, so none of it is in a page's first load.
 */
export function CommandMenuDialog({
  open,
  onOpenChange,
  returnFocusTo,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** What had focus when the menu opened (the header button, a field). */
  returnFocusTo: RefObject<HTMLElement | null>;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const setOpen = useCallback(
    (next: boolean) => {
      if (!next) setSearch("");
      onOpenChange(next);
    },
    [onOpenChange],
  );

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Search Weir"
      description="Jump to a page or a model. Use the arrow keys to move and Enter to open."
      // Opened from state, not a Radix trigger: Radix would drop focus on <body>.
      onCloseAutoFocus={(e) => {
        e.preventDefault();
        returnFocusTo.current?.focus();
      }}
    >
      <Command loop label="Search models and pages">
        <CommandInput
          value={search}
          onValueChange={setSearch}
          placeholder="Search models and pages"
          maxLength={80}
        />
        <CommandList>
          <CommandEmpty>
            No pages or models match <span className="text-fg">“{search.trim()}”</span>.
          </CommandEmpty>
          <CommandGroup heading="Pages">
            {commandPages.map((p) => (
              <CommandItem
                key={p.href}
                value={`page ${p.label}`}
                keywords={p.keywords}
                onSelect={() => go(p.href)}
              >
                <span className="text-fg">{p.label}</span>
                <CommandShortcut>{p.href}</CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
          {/* A border, not CommandSeparator: cmdk renders that as role="separator",
              which a listbox may not contain (axe aria-required-children). */}
          <CommandGroup heading="Models" className="border-t border-line">
            {models.map((m) => (
              <CommandItem
                key={m.slug}
                value={m.name}
                keywords={[m.slug, m.publisher, ...m.tasks]}
                onSelect={() => go(`/models/${m.slug}/`)}
              >
                <span className="min-w-0 truncate">
                  <span className="text-fg">{m.name}</span>
                  <span className="text-fg-2"> · {m.publisher}</span>
                </span>
                <CommandShortcut className="hidden sm:inline">{m.tasks.join(" · ")}</CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
        <div
          aria-hidden="true"
          className="hidden items-center gap-5 border-t border-line px-4 py-2.5 font-mono text-micro text-fg-2 sm:flex"
        >
          <span className="flex items-center gap-1.5">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd> move
          </span>
          <span className="flex items-center gap-1.5">
            <Kbd>↵</Kbd> open
          </span>
          <span className="flex items-center gap-1.5">
            <Kbd>esc</Kbd> close
          </span>
        </div>
      </Command>
    </CommandDialog>
  );
}
