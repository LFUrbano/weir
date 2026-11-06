import { describe, expect, it } from "vitest";
import { getModel, models, type Model } from "@/data/models";
import { endpointFor, latencyName, modelKind, modelPrice, modelSpeed, shortModelName } from "@/lib/model-display";

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

describe("shortModelName", () => {
  it("drops the Instruct suffix for use in a sentence", () => {
    expect(shortModelName(getModel("llama-3-3-70b") as Model)).toBe("Llama 3.3 70B");
    expect(shortModelName(getModel("deepseek-r1-0528") as Model)).toBe("DeepSeek R1 0528");
  });
});
