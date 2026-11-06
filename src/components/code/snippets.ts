import type { Model } from "@/data/models";

export interface Snippets {
  curl: string;
  python: string;
  node: string;
}

export type SnippetLang = keyof Snippets;

const BASE_URL = "https://api.weir.example/v1";

type Kind = "chat" | "embeddings" | "image";

function kindOf(m: Model): Kind {
  if (m.pricing.unit === "image") return "image";
  if (m.tasks.includes("embeddings")) return "embeddings";
  return "chat";
}

const PROMPTS: Record<Kind, string> = {
  chat: "Summarize this ticket in two lines.",
  embeddings: "Where is my order?",
  image: "A lighthouse at dusk, flat illustration",
};

/**
 * Ready-to-run request examples for one model. The wire format follows the
 * OpenAI-compatible API, so the stock `openai` SDKs work with a new base URL.
 */
export function snippetsFor(m: Model): Snippets {
  const kind = kindOf(m);
  const prompt = PROMPTS[kind];

  if (kind === "embeddings") {
    return {
      curl: `curl ${BASE_URL}/embeddings \\
  -H "Authorization: Bearer $WEIR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${m.slug}",
    "input": "${prompt}"
  }'`,
      python: `import os
from openai import OpenAI

client = OpenAI(
    base_url="${BASE_URL}",
    api_key=os.environ["WEIR_API_KEY"],
)

response = client.embeddings.create(
    model="${m.slug}",
    input="${prompt}",
)
print(len(response.data[0].embedding))`,
      node: `import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "${BASE_URL}",
  apiKey: process.env.WEIR_API_KEY,
});

const response = await client.embeddings.create({
  model: "${m.slug}",
  input: "${prompt}",
});
console.log(response.data[0].embedding.length);`,
    };
  }

  if (kind === "image") {
    return {
      curl: `curl ${BASE_URL}/images/generations \\
  -H "Authorization: Bearer $WEIR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${m.slug}",
    "prompt": "${prompt}",
    "size": "1024x1024"
  }'`,
      python: `import os
from openai import OpenAI

client = OpenAI(
    base_url="${BASE_URL}",
    api_key=os.environ["WEIR_API_KEY"],
)

response = client.images.generate(
    model="${m.slug}",
    prompt="${prompt}",
    size="1024x1024",
)
print(response.data[0].url)`,
      node: `import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "${BASE_URL}",
  apiKey: process.env.WEIR_API_KEY,
});

const response = await client.images.generate({
  model: "${m.slug}",
  prompt: "${prompt}",
  size: "1024x1024",
});
console.log(response.data[0].url);`,
    };
  }

  return {
    curl: `curl ${BASE_URL}/chat/completions \\
  -H "Authorization: Bearer $WEIR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${m.slug}",
    "messages": [
      { "role": "user", "content": "${prompt}" }
    ]
  }'`,
    python: `import os
from openai import OpenAI

client = OpenAI(
    base_url="${BASE_URL}",
    api_key=os.environ["WEIR_API_KEY"],
)

response = client.chat.completions.create(
    model="${m.slug}",
    messages=[
        {"role": "user", "content": "${prompt}"},
    ],
)
print(response.choices[0].message.content)`,
    node: `import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "${BASE_URL}",
  apiKey: process.env.WEIR_API_KEY,
});

const response = await client.chat.completions.create({
  model: "${m.slug}",
  messages: [{ role: "user", content: "${prompt}" }],
});
console.log(response.choices[0].message.content);`,
  };
}
