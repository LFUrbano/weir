"use client";

import { SearchIcon } from "lucide-react";
import dynamic from "next/dynamic";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import { Kbd } from "./Kbd";

const loadDialog = () => import("./CommandMenuDialog");

// Not in the first load of any page: fetched on intent (the shortcut's
// modifier key going down, the trigger hovered or focused) or at the latest on
// the first open. Not on idle: right after load, that work would land in the
// page's busiest second.
const CommandMenuDialog = dynamic(() => loadDialog().then((m) => m.CommandMenuDialog), { ssr: false });

type MenuState = { open: boolean; setOpen: (open: boolean) => void };

const MenuContext = createContext<MenuState | null>(null);

function useCommandMenu(): MenuState {
  const ctx = useContext(MenuContext);
  if (!ctx) throw new Error("useCommandMenu must be used inside <CommandMenuProvider>");
  return ctx;
}

const noopSubscribe = () => () => {};

function isApplePlatform(): boolean {
  return /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);
}

/** null on the server and during hydration, so the first client render matches the HTML. */
function useIsApple(): boolean | null {
  return useSyncExternalStore(noopSubscribe, isApplePlatform, () => null);
}

/**
 * Holds the menu's open state for the whole site and listens for the
 * shortcut: Cmd+K on Apple devices (where Ctrl+K deletes to the end of the
 * line in text fields), Ctrl+K elsewhere. Mounted once in the root layout;
 * the header trigger reads the same state.
 */
export function CommandMenuProvider({ children }: { children: ReactNode }) {
  const [open, setOpenState] = useState(false);
  // Mount the dialog on the first open and keep it, so it can animate out.
  const [mounted, setMounted] = useState(false);
  if (open && !mounted) setMounted(true);
  // Focus goes back here when the menu closes.
  const opener = useRef<HTMLElement | null>(null);
  const setOpen = useCallback((next: boolean) => {
    if (next) opener.current = document.activeElement as HTMLElement | null;
    setOpenState(next);
  }, []);

  useEffect(() => {
    const apple = isApplePlatform();
    const onKeyDown = (e: KeyboardEvent) => {
      // Ctrl or Cmd goes down before K: start fetching the menu now.
      if (e.key === (apple ? "Meta" : "Control")) void loadDialog();
      const modifier = apple ? e.metaKey && !e.ctrlKey : e.ctrlKey && !e.metaKey;
      if (e.key.toLowerCase() !== "k" || !modifier || e.altKey || e.shiftKey) return;
      e.preventDefault();
      if (e.repeat) return;
      setOpenState((o) => {
        if (!o) opener.current = document.activeElement as HTMLElement | null;
        return !o;
      });
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const value = useMemo(() => ({ open, setOpen }), [open, setOpen]);

  return (
    <MenuContext.Provider value={value}>
      {children}
      {mounted && <CommandMenuDialog open={open} onOpenChange={setOpen} returnFocusTo={opener} />}
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
      onPointerEnter={() => void loadDialog()}
      onFocus={() => void loadDialog()}
      aria-haspopup="dialog"
      aria-keyshortcuts={apple === null ? "Meta+K Control+K" : apple ? "Meta+K" : "Control+K"}
      className="inline-flex size-8 shrink-0 items-center justify-center gap-2 rounded-md text-small whitespace-nowrap text-fg-2 transition-colors duration-150 hover:bg-surface-2 hover:text-fg lg:h-8 lg:w-auto lg:border lg:border-line lg:pr-1.5 lg:pl-2.5 lg:hover:border-line-strong"
    >
      <SearchIcon aria-hidden="true" className="size-4" />
      <span className="sr-only lg:not-sr-only">Search</span>
      <Kbd className={cn("hidden min-w-[2.75rem] whitespace-nowrap lg:inline-flex", apple === null && "invisible")}>
        {apple ? "⌘ K" : "Ctrl K"}
      </Kbd>
    </button>
  );
}
