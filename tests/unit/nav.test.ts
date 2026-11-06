import { describe, expect, it } from "vitest";
import { isActivePath } from "@/lib/nav";

describe("isActivePath", () => {
  it("matches the section with or without a trailing slash", () => {
    expect(isActivePath("/models/", "/models/")).toBe(true);
    expect(isActivePath("/models", "/models/")).toBe(true);
    expect(isActivePath("/models/llama-3-3-70b/", "/models/")).toBe(true);
    expect(isActivePath("/models/llama-3-3-70b", "/models/")).toBe(true);
  });
  it("matches the whole docs section for a docs link", () => {
    expect(isActivePath("/docs/quickstart", "/docs/quickstart/")).toBe(true);
  });
  it("does not match other sections or look-alike prefixes", () => {
    expect(isActivePath("/", "/models/")).toBe(false);
    expect(isActivePath("/pricing/", "/models/")).toBe(false);
    expect(isActivePath("/models-old/", "/models/")).toBe(false);
  });
});
