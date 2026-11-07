import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
  it("keeps a custom font size next to a text color", () => {
    expect(cn("text-small", "text-fg")).toBe("text-small text-fg");
    expect(cn("text-code text-fg-2")).toBe("text-code text-fg-2");
  });
  it("still lets a later font size or color win", () => {
    expect(cn("text-small", "text-h3")).toBe("text-h3");
    expect(cn("text-fg", "text-fg-2")).toBe("text-fg-2");
  });
  it("keeps a leading-* next to a later font size (Tailwind v4: leading wins via --tw-leading)", () => {
    expect(cn("font-mono leading-none", "text-figure-xs text-fg-2")).toBe("font-mono leading-none text-figure-xs text-fg-2");
    expect(cn("leading-none", "text-small")).toBe("leading-none text-small");
    expect(cn("text-small leading-none", "text-h3")).toBe("leading-none text-h3");
    expect(cn("leading-none", "leading-tight")).toBe("leading-tight");
  });
});
