import type { MDXComponents } from "mdx/types";
import Link from "next/link";
import {
  Children,
  isValidElement,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
} from "react";
import { CodeBlock } from "@/components/code/CodeBlock";
import type { SnippetLang } from "@/components/code/snippets";
import { slugify } from "@/components/docs/outline";
import { InlineCode } from "@/components/docs/prose";

/** The text inside a heading, when it is plain text (it is, in every docs heading). */
function textOf(node: ReactNode): string {
  return Children.toArray(node)
    .map((c) => (typeof c === "string" || typeof c === "number" ? String(c) : ""))
    .join("");
}

/**
 * Fenced code blocks: the language after the backticks picks the tokenizer
 * and the label in the bar. ```sh is a terminal, ```json a response and
 * ```sse a stream of server-sent events.
 */
const FENCES: Record<string, { lang: SnippetLang; label: string }> = {
  sh: { lang: "curl", label: "Terminal" },
  bash: { lang: "curl", label: "Terminal" },
  json: { lang: "node", label: "Response" },
  sse: { lang: "node", label: "Event stream" },
  python: { lang: "python", label: "Python" },
  js: { lang: "node", label: "Node" },
};

function Pre({ children }: ComponentProps<"pre">) {
  const code = Children.toArray(children).find(isValidElement) as
    | ReactElement<{ className?: string; children?: ReactNode }>
    | undefined;
  const fence = /language-(\w+)/.exec(code?.props.className ?? "")?.[1] ?? "sh";
  const { lang, label } = FENCES[fence] ?? FENCES.sh;
  return <CodeBlock code={textOf(code?.props.children)} lang={lang} label={label} />;
}

const proseLink =
  "text-fg underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-fg";

function A({ href = "", children, ...rest }: ComponentProps<"a">) {
  // Internal pages go through the router; anything else is a plain link.
  if (href.startsWith("/")) {
    return (
      <Link href={href} className={proseLink} {...rest}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} className={proseLink} {...rest}>
      {children}
    </a>
  );
}

/** A sub-heading that links to itself, like the step headings do. */
function H3({ children }: ComponentProps<"h3">) {
  const id = slugify(textOf(children));
  return (
    <h3 id={id} className="group mt-10 text-[1.1875rem] leading-snug tracking-[-0.01em] text-fg">
      <a href={`#${id}`} className="decoration-line-strong underline-offset-4 hover:underline">
        {children}
        <span
          aria-hidden="true"
          className="ml-2 font-mono text-fg-3 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
        >
          #
        </span>
      </a>
    </h3>
  );
}

export const mdxComponents: MDXComponents = {
  h1: (props) => (
    <h1
      className="max-w-[40rem] text-[2.5rem] leading-[1.04] tracking-[-0.03em] text-fg sm:text-[3.25rem]"
      {...props}
    />
  ),
  h3: H3,
  p: (props) => <p className="max-w-[38rem] text-body leading-[1.7] text-fg" {...props} />,
  a: A,
  strong: (props) => <strong className="font-semibold text-fg" {...props} />,
  ul: (props) => (
    <ul className="max-w-[38rem] list-disc space-y-2 pl-5 text-body leading-[1.7] text-fg marker:text-fg-2" {...props} />
  ),
  ol: (props) => (
    <ol className="max-w-[38rem] list-decimal space-y-2 pl-5 text-body leading-[1.7] text-fg marker:font-mono marker:text-fg-2" {...props} />
  ),
  li: (props) => <li className="pl-1" {...props} />,
  code: InlineCode,
  pre: Pre,
  table: (props) => (
    <div
      role="region"
      aria-label="Table"
      tabIndex={0}
      className="overflow-x-auto rounded-panel border border-line bg-surface focus-visible:outline-offset-2"
    >
      <table className="w-full min-w-[34rem] border-collapse text-left text-small" {...props} />
    </div>
  ),
  th: (props) => (
    <th
      className="label-mono h-11 border-b border-line-strong px-4 text-left align-middle whitespace-nowrap text-fg-2"
      {...props}
    />
  ),
  td: (props) => (
    <td className="border-b border-line px-4 py-3 align-top text-fg in-[tr:last-child]:border-b-0" {...props} />
  ),
};

export function useMDXComponents(components: MDXComponents = {}): MDXComponents {
  return { ...mdxComponents, ...components };
}
