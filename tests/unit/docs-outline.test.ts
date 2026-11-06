import { describe, expect, it } from "vitest";
import { headingId, quickstartOutline, slugify } from "../../src/components/docs/outline";

describe("docs anchors", () => {
  it("slugs a heading into a lowercase anchor", () => {
    expect(slugify("Override the base URL")).toBe("override-the-base-url");
    expect(slugify("If the call fails")).toBe("if-the-call-fails");
    expect(slugify("Don't retry")).toBe("dont-retry");
  });

  it("gives every step a distinct, non-empty id", () => {
    const ids = quickstartOutline.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toBe(slugify(id));
  });

  it("stops the build on a heading with no usable text", () => {
    expect(() => headingId("")).toThrow(/no letters or digits/);
    expect(() => headingId("→ ✓")).toThrow(/no letters or digits/);
  });

  it("stops the build on a heading that would reuse a step's id", () => {
    expect(() => headingId("Next steps")).toThrow(/reuse the anchor id "next-steps"/);
  });

  it("accepts a normal sub-heading", () => {
    expect(headingId("Override the base URL")).toBe("override-the-base-url");
  });
});
