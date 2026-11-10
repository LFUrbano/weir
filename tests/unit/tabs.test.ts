import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function render(value: string) {
  return renderToString(
    createElement(
      Tabs,
      { value },
      createElement(
        TabsList,
        { "aria-label": "Language" },
        createElement(TabsTrigger, { value: "curl" }, "curl"),
        createElement(TabsTrigger, { value: "python" }, "Python"),
      ),
      createElement(TabsContent, { value: "curl" }, "curl body"),
      createElement(TabsContent, { value: "python" }, "python body"),
    ),
  );
}

/** The opening tag of the element whose id is `id`. */
function tagWithId(html: string, id: string) {
  return html.match(new RegExp(`<[^>]*id="${id}"[^>]*>`))?.[0] ?? "";
}

describe("Tabs (server markup, before any JavaScript)", () => {
  const html = render("curl");
  const tabs = [...html.matchAll(/<button[^>]*role="tab"[^>]*>/g)].map((m) => m[0]);
  const attr = (tag: string, name: string) => tag.match(new RegExp(`${name}="([^"]*)"`))?.[1];

  it("has a labelled tablist and one tab per value", () => {
    expect(html).toMatch(/<div[^>]*role="tablist"[^>]*aria-label="Language"/);
    expect(html).toMatch(/role="tablist"[^>]*aria-orientation="horizontal"/);
    expect(tabs).toHaveLength(2);
  });

  it("marks only the selected tab, and only it is in the tab order", () => {
    expect(tabs.map((t) => attr(t, "aria-selected"))).toEqual(["true", "false"]);
    expect(tabs.map((t) => attr(t, "data-state"))).toEqual(["active", "inactive"]);
    expect(tabs.map((t) => attr(t, "tabindex"))).toEqual(["0", "-1"]);
  });

  it("links every tab to an existing panel and back", () => {
    for (const tab of tabs) {
      const panelId = attr(tab, "aria-controls")!;
      const panel = tagWithId(html, panelId);
      expect(panel).toContain('role="tabpanel"');
      expect(attr(panel, "aria-labelledby")).toBe(attr(tab, "id"));
    }
  });

  it("renders the selected panel's content and keeps the others hidden and empty", () => {
    expect(html).toContain("curl body");
    expect(html).not.toContain("python body");
    const python = tagWithId(html, attr(tabs[1], "aria-controls")!);
    expect(python).toMatch(/\bhidden=""/);
    const curl = tagWithId(html, attr(tabs[0], "aria-controls")!);
    expect(curl).not.toMatch(/\bhidden/);
    expect(attr(curl, "tabindex")).toBe("0");
  });

  it("follows the value it is given", () => {
    const other = render("python");
    expect(other).toContain("python body");
    expect(other).not.toContain("curl body");
  });
});
