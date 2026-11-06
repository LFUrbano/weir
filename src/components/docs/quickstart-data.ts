import { getModel, isTokenModel, type TokenModel } from "@/data/models";
import { formatUsd } from "@/lib/format";

/**
 * Values the quickstart page reads. They live in a plain module because an
 * MDX page is a Next route module, and a route module may only export what
 * Next knows (`metadata`, and so on).
 */

function referenceModel(): TokenModel {
  const m = getModel("llama-3-3-70b");
  if (!m || !isTokenModel(m)) throw new Error("The quickstart needs the llama-3-3-70b token model.");
  return m;
}

/** The model every example calls. */
export const model = referenceModel();

/** Token counts in the sample response. */
export const usage = { prompt: 17, completion: 62 } as const;

/** What the sample call costs at the model's prices, as a dollar string. */
export const firstCallCost = formatUsd(
  (usage.prompt * model.pricing.input + usage.completion * model.pricing.output) / 1_000_000,
);

export const install = {
  python: "pip install weir",
  node: "npm install weir",
};

export const customBaseUrl = {
  python: `import os
from weir import Weir

client = Weir(
    api_key=os.environ["WEIR_API_KEY"],
    base_url="http://localhost:8080/v1",
)`,
  node: `import Weir from "weir";

const client = new Weir({
  apiKey: process.env.WEIR_API_KEY,
  baseURL: "http://localhost:8080/v1",
});`,
};
