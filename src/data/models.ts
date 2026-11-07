import type { GpuId } from "@/data/gpus";

export type Task = "chat" | "reasoning" | "code" | "embeddings" | "vision" | "image";
export type Region = "us-east" | "us-west" | "eu-west";

/** Token models bill per 1M tokens in USD; image models bill per generated image. */
export type Pricing =
  | { unit: "tokens"; input: number; output: number }
  | { unit: "image"; perImage: number };

export interface DedicatedSpec {
  gpu: GpuId;
  gpusPerReplica: number;
  /** Peak tokens per second one replica sustains (input plus output). */
  replicaTokensPerSec: number;
}

export interface Model {
  slug: string;
  name: string;
  publisher: string;
  tasks: Task[];
  summary: string;
  /**
   * Context window Weir serves, in thousands of tokens (it can be shorter than
   * the weights allow, to fit the KV cache on the replica); null for image models.
   */
  contextK: number | null;
  quantization: "FP8" | "BF16" | "INT4";
  pricing: Pricing;
  /** Median time to first token (or full response for embeddings and images), in ms. */
  p50Ms: number;
  /** Decode speed per request; null for embeddings and image models. */
  tokensPerSec: number | null;
  regions: Region[];
  dedicated: DedicatedSpec | null;
}

export type TokenPricing = Extract<Pricing, { unit: "tokens" }>;
export type TokenModel = Model & { pricing: TokenPricing };
export type DedicatedModel = Model & { dedicated: DedicatedSpec };

export function isTokenModel(m: Model): m is TokenModel {
  return m.pricing.unit === "tokens";
}

export function isDedicatedModel(m: Model): m is DedicatedModel {
  return m.dedicated !== null;
}

const ALL: Region[] = ["us-east", "us-west", "eu-west"];

export const models: Model[] = [
  {
    slug: "llama-3-3-70b",
    name: "Llama 3.3 70B Instruct",
    publisher: "Meta",
    tasks: ["chat"],
    summary:
      "A 70B instruction-tuned model that handles support replies, summaries and tool calls at a mid-range price.",
    contextK: 128,
    quantization: "FP8",
    pricing: { unit: "tokens", input: 0.54, output: 0.72 },
    p50Ms: 212,
    tokensPerSec: 96,
    regions: [...ALL],
    dedicated: { gpu: "h100", gpusPerReplica: 2, replicaTokensPerSec: 6000 },
  },
  {
    slug: "llama-3-1-8b",
    name: "Llama 3.1 8B Instruct",
    publisher: "Meta",
    tasks: ["chat"],
    summary:
      "A small, fast model for classification, extraction and short replies where cost per request matters most.",
    contextK: 128,
    quantization: "FP8",
    pricing: { unit: "tokens", input: 0.1, output: 0.14 },
    p50Ms: 74,
    tokensPerSec: 240,
    regions: [...ALL],
    dedicated: { gpu: "h100", gpusPerReplica: 1, replicaTokensPerSec: 30000 },
  },
  {
    slug: "llama-4-scout",
    name: "Llama 4 Scout",
    publisher: "Meta",
    tasks: ["chat", "vision"],
    summary:
      "A mixture-of-experts model with a very long context window, useful for reading whole codebases or contract bundles in one request.",
    // The weights allow 10M; 1M is what fits next to them on one H200.
    contextK: 1000,
    quantization: "FP8",
    pricing: { unit: "tokens", input: 0.18, output: 0.59 },
    p50Ms: 130,
    tokensPerSec: 150,
    regions: [...ALL],
    dedicated: { gpu: "h200", gpusPerReplica: 1, replicaTokensPerSec: 9000 },
  },
  {
    slug: "llama-4-maverick",
    name: "Llama 4 Maverick",
    publisher: "Meta",
    tasks: ["chat", "vision"],
    summary:
      "A larger mixture-of-experts model that reads images and text and gives more careful answers than Scout.",
    contextK: 1000,
    quantization: "FP8",
    pricing: { unit: "tokens", input: 0.27, output: 0.85 },
    p50Ms: 165,
    tokensPerSec: 118,
    regions: ["us-east", "us-west"],
    dedicated: null,
  },
  {
    slug: "qwen3-235b-a22b",
    name: "Qwen3 235B A22B",
    publisher: "Alibaba",
    tasks: ["chat", "reasoning"],
    summary:
      "A large mixture-of-experts model with a switchable thinking mode, strong on multilingual and math-heavy prompts.",
    contextK: 128,
    quantization: "FP8",
    pricing: { unit: "tokens", input: 0.22, output: 0.88 },
    p50Ms: 240,
    tokensPerSec: 85,
    regions: ["us-east", "eu-west"],
    dedicated: null,
  },
  {
    slug: "qwen3-32b",
    name: "Qwen3 32B",
    publisher: "Alibaba",
    tasks: ["chat", "reasoning"],
    summary:
      "A dense 32B model that can think step by step or answer directly, and fits on a single H100.",
    contextK: 128,
    quantization: "FP8",
    pricing: { unit: "tokens", input: 0.3, output: 0.5 },
    p50Ms: 150,
    tokensPerSec: 130,
    regions: [...ALL],
    dedicated: { gpu: "h100", gpusPerReplica: 1, replicaTokensPerSec: 5000 },
  },
  {
    slug: "qwen3-8b",
    name: "Qwen3 8B",
    publisher: "Alibaba",
    tasks: ["chat"],
    summary:
      "An 8B model with solid multilingual coverage, priced for high-volume routing and tagging jobs.",
    contextK: 128,
    quantization: "BF16",
    pricing: { unit: "tokens", input: 0.07, output: 0.12 },
    p50Ms: 68,
    tokensPerSec: 270,
    regions: [...ALL],
    dedicated: null,
  },
  {
    slug: "qwen2-5-coder-32b",
    name: "Qwen2.5 Coder 32B Instruct",
    publisher: "Alibaba",
    tasks: ["code"],
    summary:
      "A code model for completion, refactoring and test generation across more than 40 programming languages.",
    contextK: 128,
    quantization: "FP8",
    pricing: { unit: "tokens", input: 0.28, output: 0.44 },
    p50Ms: 140,
    tokensPerSec: 125,
    regions: [...ALL],
    dedicated: { gpu: "h100", gpusPerReplica: 1, replicaTokensPerSec: 5200 },
  },
  {
    slug: "qwen3-coder-480b-a35b",
    name: "Qwen3 Coder 480B A35B",
    publisher: "Alibaba",
    tasks: ["code"],
    summary:
      "A very large coding model built for agents that edit many files, run tools and read long repositories.",
    contextK: 256,
    quantization: "FP8",
    pricing: { unit: "tokens", input: 0.95, output: 1.9 },
    p50Ms: 290,
    tokensPerSec: 70,
    regions: ["us-east", "us-west"],
    dedicated: null,
  },
  {
    slug: "deepseek-v3-1",
    name: "DeepSeek V3.1",
    publisher: "DeepSeek",
    tasks: ["chat", "code"],
    summary:
      "A 671B mixture-of-experts model for general chat and code, with a hybrid mode that can reason before it answers.",
    contextK: 128,
    quantization: "FP8",
    pricing: { unit: "tokens", input: 0.55, output: 1.65 },
    p50Ms: 280,
    tokensPerSec: 62,
    regions: ["us-east", "eu-west"],
    dedicated: null,
  },
  {
    slug: "deepseek-r1-0528",
    name: "DeepSeek R1 0528",
    publisher: "DeepSeek",
    tasks: ["reasoning"],
    summary:
      "A reasoning model that writes out its chain of thought before answering, suited to math, logic and hard debugging.",
    contextK: 128,
    quantization: "INT4",
    pricing: { unit: "tokens", input: 0.7, output: 2.4 },
    p50Ms: 520,
    tokensPerSec: 48,
    regions: ["us-east", "us-west"],
    dedicated: null,
  },
  {
    slug: "deepseek-r1-distill-llama-70b",
    name: "DeepSeek R1 Distill Llama 70B",
    publisher: "DeepSeek",
    tasks: ["reasoning"],
    summary:
      "R1's reasoning style distilled into a 70B Llama, with shorter thinking and a lower price than the full model.",
    contextK: 128,
    quantization: "FP8",
    pricing: { unit: "tokens", input: 0.58, output: 0.78 },
    p50Ms: 230,
    tokensPerSec: 90,
    regions: [...ALL],
    dedicated: { gpu: "h100", gpusPerReplica: 2, replicaTokensPerSec: 5800 },
  },
  {
    slug: "mistral-small-3-2",
    name: "Mistral Small 3.2 24B",
    publisher: "Mistral AI",
    tasks: ["chat", "vision"],
    summary:
      "A 24B model that follows instructions closely, calls functions reliably and reads images, at a low price.",
    contextK: 128,
    quantization: "BF16",
    pricing: { unit: "tokens", input: 0.1, output: 0.25 },
    p50Ms: 110,
    tokensPerSec: 170,
    regions: [...ALL],
    dedicated: { gpu: "h100", gpusPerReplica: 1, replicaTokensPerSec: 9000 },
  },
  {
    slug: "mistral-large-3",
    name: "Mistral Large 3",
    publisher: "Mistral AI",
    tasks: ["chat", "vision"],
    summary:
      "Mistral's largest open model, a mixture-of-experts design for long documents, tool use and European languages.",
    contextK: 256,
    quantization: "FP8",
    pricing: { unit: "tokens", input: 0.65, output: 1.6 },
    p50Ms: 270,
    tokensPerSec: 58,
    regions: ["us-east", "eu-west"],
    dedicated: null,
  },
  {
    slug: "devstral-small-2",
    name: "Devstral Small 2",
    publisher: "Mistral AI",
    tasks: ["code"],
    summary:
      "A 24B model tuned for software engineering agents that open files, run commands and fix failing tests.",
    contextK: 128,
    quantization: "FP8",
    pricing: { unit: "tokens", input: 0.09, output: 0.3 },
    p50Ms: 120,
    tokensPerSec: 160,
    regions: [...ALL],
    dedicated: null,
  },
  {
    slug: "gemma-3-27b",
    name: "Gemma 3 27B",
    publisher: "Google",
    tasks: ["chat", "vision"],
    summary:
      "A 27B model that reads images and text in more than 140 languages and runs on a single H100.",
    contextK: 128,
    quantization: "BF16",
    pricing: { unit: "tokens", input: 0.2, output: 0.4 },
    p50Ms: 135,
    tokensPerSec: 140,
    regions: [...ALL],
    dedicated: { gpu: "h100", gpusPerReplica: 1, replicaTokensPerSec: 6000 },
  },
  {
    slug: "phi-4",
    name: "Phi-4 14B",
    publisher: "Microsoft",
    tasks: ["chat", "reasoning"],
    summary:
      "A compact 14B model trained on curated data, good at math and short reasoning chains for its size.",
    contextK: 16,
    quantization: "BF16",
    pricing: { unit: "tokens", input: 0.07, output: 0.14 },
    p50Ms: 85,
    tokensPerSec: 200,
    regions: ["us-east", "eu-west"],
    dedicated: null,
  },
  {
    slug: "qwen2-5-vl-72b",
    name: "Qwen2.5 VL 72B Instruct",
    publisher: "Alibaba",
    tasks: ["vision", "chat"],
    summary:
      "A 72B vision-language model that reads charts, screenshots, scanned forms and long documents.",
    contextK: 32,
    quantization: "FP8",
    pricing: { unit: "tokens", input: 0.6, output: 0.8 },
    p50Ms: 330,
    tokensPerSec: 80,
    regions: ["us-east", "us-west"],
    dedicated: null,
  },
  {
    slug: "bge-m3",
    name: "BGE-M3",
    publisher: "BAAI",
    tasks: ["embeddings"],
    summary:
      "A multilingual embedding model that returns 1024-dimension vectors for dense, sparse and multi-vector search.",
    contextK: 8,
    quantization: "BF16",
    pricing: { unit: "tokens", input: 0.01, output: 0 },
    p50Ms: 18,
    tokensPerSec: null,
    regions: [...ALL],
    dedicated: null,
  },
  {
    slug: "nomic-embed-text-v1-5",
    name: "Nomic Embed Text v1.5",
    publisher: "Nomic",
    tasks: ["embeddings"],
    summary:
      "An English text embedding model with adjustable vector sizes from 64 to 768 dimensions for cheaper storage.",
    contextK: 8,
    quantization: "BF16",
    pricing: { unit: "tokens", input: 0.008, output: 0 },
    p50Ms: 14,
    tokensPerSec: null,
    regions: ["us-east", "us-west"],
    dedicated: null,
  },
  {
    slug: "qwen3-embedding-8b",
    name: "Qwen3 Embedding 8B",
    publisher: "Alibaba",
    tasks: ["embeddings"],
    summary:
      "An 8B embedding model that ranks near the top of multilingual retrieval benchmarks and supports instructions in the query.",
    contextK: 32,
    quantization: "BF16",
    pricing: { unit: "tokens", input: 0.02, output: 0 },
    p50Ms: 41,
    tokensPerSec: null,
    regions: ["us-east", "eu-west"],
    dedicated: null,
  },
  {
    slug: "flux-1-dev",
    name: "FLUX.1 [dev]",
    publisher: "Black Forest Labs",
    tasks: ["image"],
    summary:
      "A 12B text-to-image model with strong prompt following and legible text, producing a 1024 by 1024 image in about four seconds.",
    contextK: null,
    quantization: "BF16",
    pricing: { unit: "image", perImage: 0.025 },
    p50Ms: 4200,
    tokensPerSec: null,
    regions: ["us-east", "us-west"],
    dedicated: null,
  },
  {
    slug: "flux-1-schnell",
    name: "FLUX.1 [schnell]",
    publisher: "Black Forest Labs",
    tasks: ["image"],
    summary:
      "A distilled FLUX model that makes an image in four steps, built for previews and high-volume jobs.",
    contextK: null,
    quantization: "BF16",
    pricing: { unit: "image", perImage: 0.003 },
    p50Ms: 900,
    tokensPerSec: null,
    regions: [...ALL],
    dedicated: null,
  },
  {
    slug: "stable-diffusion-3-5-large",
    name: "Stable Diffusion 3.5 Large",
    publisher: "Stability AI",
    tasks: ["image"],
    summary:
      "An 8B text-to-image model with a wide range of styles, good for illustration, product shots and concept art.",
    contextK: null,
    quantization: "BF16",
    pricing: { unit: "image", perImage: 0.035 },
    p50Ms: 5600,
    tokensPerSec: null,
    regions: ["us-east", "eu-west"],
    dedicated: null,
  },
];

export function getModel(slug: string): Model | undefined {
  return models.find((m) => m.slug === slug);
}
