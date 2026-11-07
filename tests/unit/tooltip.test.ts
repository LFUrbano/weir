import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

describe("Tooltip", () => {
  it("renders without a TooltipProvider above it (the root layout has none)", () => {
    const html = renderToString(
      createElement(
        Tooltip,
        null,
        createElement(TooltipTrigger, null, "Hover me"),
        createElement(TooltipContent, null, "Hint"),
      ),
    );
    expect(html).toContain("Hover me");
  });
});
