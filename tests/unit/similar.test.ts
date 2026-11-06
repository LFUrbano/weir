import { describe, expect, it } from "vitest";
import { getModel, models } from "@/data/models";
import { similarModels } from "@/lib/similar";

describe("similarModels", () => {
  it("returns up to three other models that share a task", () => {
    for (const m of models) {
      const list = similarModels(m);
      expect(list.length, m.slug).toBeLessThanOrEqual(3);
      expect(list.length, m.slug).toBeGreaterThan(0);
      expect(list.map((s) => s.slug)).not.toContain(m.slug);
      expect(new Set(list.map((s) => s.slug)).size).toBe(list.length);
      for (const s of list) {
        expect(s.tasks.some((t) => m.tasks.includes(t)), `${m.slug} -> ${s.slug}`).toBe(true);
      }
    }
  });

  it("fills three slots for a chat model, closest price first", () => {
    const llama = getModel("llama-3-3-70b")!;
    const list = similarModels(llama);
    expect(list).toHaveLength(3);
    // DeepSeek R1 Distill Llama 70B is reasoning-only; chat models come first.
    for (const s of list) expect(s.tasks).toContain("chat");
  });

  it("never pads image models with token models", () => {
    const flux = getModel("flux-1-dev")!;
    const list = similarModels(flux);
    expect(list.map((s) => s.slug).sort()).toEqual(["flux-1-schnell", "stable-diffusion-3-5-large"]);
  });

  it("is stable", () => {
    const m = getModel("qwen3-32b")!;
    expect(similarModels(m)).toEqual(similarModels(m));
  });
});
