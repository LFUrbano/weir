import { describe, expect, it } from "vitest";
import { getModel, models } from "@/data/models";
import { snippetsFor } from "@/components/code/snippets";
import { highlight, type Token } from "@/components/code/highlight";

function model(slug: string) {
  const m = getModel(slug);
  if (!m) throw new Error(`missing model ${slug}`);
  return m;
}

describe("snippetsFor", () => {
  it("builds a chat request for token models", () => {
    const s = snippetsFor(model("llama-3-3-70b"));
    expect(s.curl).toContain("https://api.weir.example/v1/chat/completions");
    expect(s.curl).toContain('"model": "llama-3-3-70b"');
    expect(s.python).toContain('model="llama-3-3-70b"');
    expect(s.python).toContain("chat.completions.create");
    expect(s.node).toContain('model: "llama-3-3-70b"');
    expect(s.node).toContain("chat.completions.create");
  });

  it("uses the images endpoint for image models", () => {
    const m = model("flux-1-dev");
    const s = snippetsFor(m);
    expect(s.curl).toContain("https://api.weir.example/v1/images/generations");
    expect(s.curl).toContain(`"model": "${m.slug}"`);
    expect(s.python).toContain("images.generate");
    expect(s.node).toContain("images.generate");
    expect(s.curl).not.toContain("chat/completions");
  });

  it("uses the embeddings endpoint for embedding models", () => {
    const m = model("bge-m3");
    const s = snippetsFor(m);
    expect(s.curl).toContain("https://api.weir.example/v1/embeddings");
    expect(s.curl).toContain(`"model": "${m.slug}"`);
    expect(s.python).toContain("embeddings.create");
    expect(s.node).toContain("embeddings.create");
  });

  it("uses the Weir SDK, not another vendor's, in Python and Node", () => {
    for (const m of models) {
      const s = snippetsFor(m);
      expect(s.python).toContain("from weir import Weir");
      expect(s.python).toContain("Weir(");
      expect(s.node).toContain('import Weir from "weir"');
      expect(s.node).toContain("new Weir(");
      for (const code of [s.python, s.node]) {
        expect(code.toLowerCase()).toContain("weir");
        expect(code.toLowerCase()).not.toContain("openai");
      }
    }
  });

  it("covers every model in all three languages without secrets", () => {
    for (const m of models) {
      const s = snippetsFor(m);
      for (const code of [s.curl, s.python, s.node]) {
        expect(code).toContain(m.slug);
        expect(code).toContain("WEIR_API_KEY");
        expect(code.endsWith("\n")).toBe(false);
        expect(code).not.toMatch(/sk-|Bearer [A-Za-z0-9]{10,}/);
      }
    }
  });
});

const join = (tokens: Token[]) => tokens.map((t) => t.text).join("");
const find = (tokens: Token[], type: Token["type"], text: string) =>
  tokens.some((t) => t.type === type && t.text === text);

describe("highlight", () => {
  it("never changes the text", () => {
    for (const m of models) {
      const s = snippetsFor(m);
      expect(join(highlight(s.curl, "curl"))).toBe(s.curl);
      expect(join(highlight(s.python, "python"))).toBe(s.python);
      expect(join(highlight(s.node, "node"))).toBe(s.node);
    }
  });

  it("marks curl commands, flags, strings and JSON keys", () => {
    const t = highlight(
      `curl https://x.example \\\n  -H "A: b" \\\n  -d '{ "model": "m" }'`,
      "curl",
    );
    expect(find(t, "keyword", "curl")).toBe(true);
    expect(find(t, "keyword", "-H")).toBe(true);
    expect(find(t, "keyword", "-d")).toBe(true);
    expect(find(t, "string", '"A: b"')).toBe(true);
    expect(find(t, "key", '"model"')).toBe(true);
    expect(find(t, "string", '"m"')).toBe(true);
  });

  it("marks Python imports, keyword arguments and comments", () => {
    const t = highlight('from x import Y  # note\nf(model="m", n=1)', "python");
    expect(find(t, "keyword", "from")).toBe(true);
    expect(find(t, "keyword", "import")).toBe(true);
    expect(find(t, "comment", "# note")).toBe(true);
    expect(find(t, "key", "model")).toBe(true);
    expect(find(t, "string", '"m"')).toBe(true);
  });

  it("marks Node keywords, object keys and comments", () => {
    const t = highlight('const a = await f({ model: "m", "x-y": 1 }); // ok', "node");
    expect(find(t, "keyword", "const")).toBe(true);
    expect(find(t, "keyword", "await")).toBe(true);
    expect(find(t, "key", "model")).toBe(true);
    expect(find(t, "key", '"x-y"')).toBe(true);
    expect(find(t, "comment", "// ok")).toBe(true);
  });

  it("does not treat a URL inside a string as a comment", () => {
    const t = highlight('const u = "https://api.weir.example/v1";', "node");
    expect(find(t, "string", '"https://api.weir.example/v1"')).toBe(true);
    expect(t.some((x) => x.type === "comment")).toBe(false);
  });

  it("handles empty input and unterminated strings", () => {
    expect(highlight("", "node")).toEqual([]);
    expect(join(highlight('x = "oops', "python"))).toBe('x = "oops');
  });
});
