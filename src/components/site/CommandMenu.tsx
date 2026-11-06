"use client";

import { SearchIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { models } from "@/data/models";
import { commandPages } from "@/data/site";
import { cn } from "@/lib/utils";

type MenuState = { open: boolean; setOpen: (open: boolean) => void };

const MenuContext = createContext<MenuState | null>(null);

function useCommandMenu(): MenuState {
  const ctx = useContext(MenuContext);
  if (!ctx) throw new Error("useCommandMenu must be used inside <CommandMenuProvider>");
  return ctx;
}

const noopSubscribe = () => () => {};

/** null on the server and during hydration, so the first client render matches the HTML. */
function useIsApple(): boolean | null {
  return useSyncExternalStore(
    noopSubscribe,
    () => /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent),
    () => null,
  );
}

function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-sm border border-line-strong px-1 font-mono text-[0.6875rem] text-fg-2",
        className,
      )}
    >
      {children}
    </kbd>
  );
}

/**
 * Holds the menu's open state for the whole site and listens for Cmd+K /
 * Ctrl+K. Mounted once in the root layout; the header trigger reads the same
 * state.
 */
export function CommandMenuProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "k" || !(e.metaKey || e.ctrlKey) || e.altKey || e.shiftKey) return;
      e.preventDefault();
      if (!e.repeat) setOpen((o) => !o);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const value = useMemo(() => ({ open, setOpen }), [open]);

  return (
    <MenuContext.Provider value={value}>
      {children}
      <CommandMenu open={open} onOpenChange={setOpen} />
    </MenuContext.Provider>
  );
}

/** Header button: "Search ⌘K" from lg up, an icon button below that. */
export function CommandMenuTrigger() {
  const { setOpen } = useCommandMenu();
  const apple = useIsApple();

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-keyshortcuts="Meta+K Control+K"
      className="inline-flex size-8 shrink-0 items-center justify-center gap-2 rounded-md text-[0.875rem] whitespace-nowrap text-fg-2 transition-colors duration-150 hover:bg-surface-2 hover:text-fg lg:h-8 lg:w-auto lg:border lg:border-line lg:pr-1.5 lg:pl-2.5 lg:hover:border-line-strong"
    >
      <SearchIcon aria-hidden="true" className="size-4" />
      <span className="sr-only lg:not-sr-only">Search</span>
      <Kbd className={cn("hidden min-w-[2.75rem] whitespace-nowrap lg:inline-flex", apple === null && "invisible")}>
        {apple ? "⌘ K" : "Ctrl K"}
      </Kbd>
    </button>
  );
}

function CommandMenu({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
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
          <CommandSeparator />
          <CommandGroup heading="Models">
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
          className="hidden items-center gap-5 border-t border-line px-4 py-2.5 font-mono text-[0.6875rem] text-fg-2 sm:flex"
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
