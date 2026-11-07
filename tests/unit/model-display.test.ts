import { describe, expect, it } from "vitest";
import { getModel, models, type Model } from "@/data/models";
import {
  endpointFor,
  endpointPath,
  latencyName,
  modelKind,
  modelPrice,
  modelSpeed,
  requestShapeLine,
  shortModelName,
} from "@/lib/model-display";
import { BREAK_EVEN_LABEL, formatBreakEven } from "@/lib/model-display";

function model(slug: string): Model {
  const m = getModel(slug);
  if (!m) throw new Error(`missing model ${slug}`);
  return m;
}

describe("modelPrice", () => {
  it("shows input and output per 1M tokens for chat models", () => {
    expect(modelPrice(model("llama-3-3-70b"))).toEqual({
      unit: "tokens",
      input: "$0.54",
      output: "$0.72",
    });
  });
  it("shows a dash for the output of embedding models", () => {
    expect(modelPrice(model("bge-m3"))).toEqual({ unit: "tokens", input: "$0.01", output: "—" });
  });
  it("shows image models per image", () => {
    expect(modelPrice(model("flux-1-dev"))).toEqual({ unit: "image", perImage: "$0.025 / image" });
  });
  it("never prints NaN or Infinity for any model", () => {
    for (const m of models) {
      const text = JSON.stringify(modelPrice(m)) + modelSpeed(m);
      expect(text).not.toMatch(/NaN|Infinity/);
    }
  });
});

describe("modelSpeed", () => {
  it("prints decode speed in tokens per second", () => {
    expect(modelSpeed(model("llama-3-3-70b"))).toBe("96 tok/s");
  });
  it("prints a dash for embeddings and image models", () => {
    expect(modelSpeed(model("bge-m3"))).toBe("—");
    expect(modelSpeed(model("flux-1-dev"))).toBe("—");
  });
});

describe("modelKind, endpointFor and latencyName", () => {
  it("names what one request does for each kind of model", () => {
    const llama = model("llama-3-3-70b");
    expect(modelKind(llama)).toBe("chat");
    expect(endpointFor(llama)).toBe("POST /v1/chat/completions");
    expect(latencyName(llama)).toBe("Time to first token");

    const bge = model("bge-m3");
    expect(modelKind(bge)).toBe("embeddings");
    expect(endpointFor(bge)).toBe("POST /v1/embeddings");
    expect(latencyName(bge)).toBe("Response time");

    const flux = model("flux-1-dev");
    expect(modelKind(flux)).toBe("image");
    expect(endpointFor(flux)).toBe("POST /v1/images/generations");
    expect(latencyName(flux)).toBe("Response time");
  });
});

describe("requestShapeLine", () => {
  it("scopes the shared request shape to the model's own endpoint", () => {
    expect(requestShapeLine(model("llama-3-3-70b"))).toBe(
      "The same request shape as every other model on /v1/chat/completions. Switching between them is a change to one string.",
    );
    expect(requestShapeLine(model("bge-m3"))).toBe(
      "The same request shape as every other model on /v1/embeddings. Switching between them is a change to one string.",
    );
    expect(requestShapeLine(model("flux-1-dev"))).toBe(
      "The same request shape as every other model on /v1/images/generations. Switching between them is a change to one string.",
    );
  });

  it("never claims that every model on Weir shares one shape", () => {
    for (const m of models) {
      const line = requestShapeLine(m);
      expect(line).toContain(endpointPath(m));
      expect(endpointFor(m)).toBe(`POST ${endpointPath(m)}`);
      expect(line).not.toMatch(/model on Weir|all \d+ models/i);
      // Every endpoint serves more than one model, so "every other" is never empty.
      expect(models.filter((o) => o !== m && modelKind(o) === modelKind(m)).length).toBeGreaterThan(0);
    }
  });
});

describe("shortModelName", () => {
  it("drops the Instruct suffix for use in a sentence", () => {
    expect(shortModelName(getModel("llama-3-3-70b") as Model)).toBe("Llama 3.3 70B");
    expect(shortModelName(getModel("deepseek-r1-0528") as Model)).toBe("DeepSeek R1 0528");
  });
});

describe("break-even wording", () => {
  it("names one replica and never claims dedicated wins at every volume above", () => {
    expect(BREAK_EVEN_LABEL).toBe("Break-even, 1 replica");
    expect(BREAK_EVEN_LABEL).not.toMatch(/above/i);
    expect(formatBreakEven(5_770_476_190)).toBe("5.77B tok/mo");
  });
});
