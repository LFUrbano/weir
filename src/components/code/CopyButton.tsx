"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const RESET_MS = 2000;

/** Clipboard API first; a hidden textarea for insecure contexts and old browsers. */
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to the textarea fallback.
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  } catch {
    return false;
  }
}

type State = "idle" | "copied" | "failed";

/** Copies `text` exactly as given (plain text, no markup) and confirms for about two seconds. */
export function CopyButton({ text, className }: { text: string; className?: string }) {
  const [state, setState] = useState<State>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  async function onClick() {
    const ok = await copyText(text);
    setState(ok ? "copied" : "failed");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), RESET_MS);
  }

  const label = state === "copied" ? "Copied" : state === "failed" ? "Copy failed" : "Copy";
  const Icon = state === "copied" ? Check : state === "failed" ? X : Copy;

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onClick}
        className={cn(
          "font-mono text-[0.8125rem]",
          state === "copied" && "text-ok hover:text-ok",
          state === "failed" && "text-err hover:text-err",
          className,
        )}
      >
        <Icon aria-hidden="true" />
        {label}
      </Button>
      {/* Always mounted so screen readers pick up the change. */}
      <span role="status" aria-live="polite" className="sr-only">
        {state === "copied" ? "Copied to clipboard" : state === "failed" ? "Copy failed" : ""}
      </span>
    </>
  );
}
