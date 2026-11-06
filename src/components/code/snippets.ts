import type { Model } from "@/data/models";
import { modelKind, type ModelKind } from "@/lib/model-display";

export interface Snippets {
  curl: string;
  python: string;
  node: string;
}

export type SnippetLang = keyof Snippets;

/** Where the Weir SDKs point by default; curl examples spell it out. */
export const API_BASE_URL = "https://api.weir.example/v1";

type Kind = ModelKind;

const PROMPTS: Record<Kind, string> = {
  chat: "What does a KV cache do?",
  embeddings: "Where is my order?",
  image: "A lighthouse at dusk, flat illustration",
};

export interface SnippetOptions {
  /**
   * Stream the response as server-sent events. Applies to chat models only;
   * embeddings and images return in one piece.
   */
  stream?: boolean;
}

/**
 * Ready-to-run request examples for one model. Python and Node use the Weir
 * SDK, which defaults to the Weir API base URL; curl spells the URL out.
 */
export function snippetsFor(m: Model, { stream = false }: SnippetOptions = {}): Snippets {
  const kind = modelKind(m);
  const prompt = PROMPTS[kind];

  if (kind === "embeddings") {
    return {
      curl: `curl ${API_BASE_URL}/embeddings \\
  -H "Authorization: Bearer $WEIR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${m.slug}",
    "input": "${prompt}"
  }'`,
      python: `import os
from weir import Weir

client = Weir(api_key=os.environ["WEIR_API_KEY"])

response = client.embeddings.create(
    model="${m.slug}",
    input="${prompt}",
)
print(len(response.data[0].embedding))`,
      node: `import Weir from "weir";

const client = new Weir({ apiKey: process.env.WEIR_API_KEY });

const response = await client.embeddings.create({
  model: "${m.slug}",
  input: "${prompt}",
});
console.log(response.data[0].embedding.length);`,
    };
  }

  if (kind === "image") {
    return {
      curl: `curl ${API_BASE_URL}/images/generations \\
  -H "Authorization: Bearer $WEIR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${m.slug}",
    "prompt": "${prompt}",
    "size": "1024x1024"
  }'`,
      python: `import os
from weir import Weir

client = Weir(api_key=os.environ["WEIR_API_KEY"])

response = client.images.generate(
    model="${m.slug}",
    prompt="${prompt}",
    size="1024x1024",
)
print(response.data[0].url)`,
      node: `import Weir from "weir";

const client = new Weir({ apiKey: process.env.WEIR_API_KEY });

const response = await client.images.generate({
  model: "${m.slug}",
  prompt: "${prompt}",
  size: "1024x1024",
});
console.log(response.data[0].url);`,
    };
  }

  if (stream) {
    return {
      curl: `curl -N ${API_BASE_URL}/chat/completions \\
  -H "Authorization: Bearer $WEIR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${m.slug}",
    "stream": true,
    "messages": [
      { "role": "user", "content": "${prompt}" }
    ]
  }'`,
      python: `import os
from weir import Weir

client = Weir(api_key=os.environ["WEIR_API_KEY"])

stream = client.chat.completions.create(
    model="${m.slug}",
    messages=[{"role": "user", "content": "${prompt}"}],
    stream=True,
)
for chunk in stream:
    print(chunk.choices[0].delta.content or "", end="")`,
      node: `import Weir from "weir";

const client = new Weir({ apiKey: process.env.WEIR_API_KEY });

const stream = await client.chat.completions.create({
  model: "${m.slug}",
  messages: [{ role: "user", content: "${prompt}" }],
  stream: true,
});
for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0].delta.content ?? "");
}`,
    };
  }

  return {
    curl: `curl ${API_BASE_URL}/chat/completions \\
  -H "Authorization: Bearer $WEIR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${m.slug}",
    "messages": [
      { "role": "user", "content": "${prompt}" }
    ]
  }'`,
    python: `import os
from weir import Weir

client = Weir(api_key=os.environ["WEIR_API_KEY"])

response = client.chat.completions.create(
    model="${m.slug}",
    messages=[{"role": "user", "content": "${prompt}"}],
)
print(response.choices[0].message.content)`,
    node: `import Weir from "weir";

const client = new Weir({ apiKey: process.env.WEIR_API_KEY });

const response = await client.chat.completions.create({
  model: "${m.slug}",
  messages: [{ role: "user", content: "${prompt}" }],
});
console.log(response.choices[0].message.content);`,
  };
}
