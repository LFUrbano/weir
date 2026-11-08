"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { copyText } from "@/components/code/CopyButton";
import { StatusDot } from "@/components/site/StatusDot";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { models, type Model } from "@/data/models";
import { COMPARE_PATH, compareRows, compareSearch, type CompareGroup } from "@/lib/compare";
import { formatContext } from "@/lib/format";
import { modelKind, shortModelName, type ModelKind } from "@/lib/model-display";
import { cn } from "@/lib/utils";
import { pushPair, useComparePair } from "./use-compare-pair";

type Side = "a" | "b";

/** A's color and B's, the same in the cards, the table header and the volume bars. */
export const SIDE_MARK: Record<Side, string> = { a: "bg-fg", b: "bg-fg-3" };

export function SideMark({ side }: { side: Side }) {
  return <span aria-hidden="true" className={cn("inline-block size-2 shrink-0 rounded-xs", SIDE_MARK[side])} />;
}

const KIND_LABELS: Record<ModelKind, string> = {
  chat: "Chat, reasoning and code",
  embeddings: "Embeddings",
  image: "Image",
};

const KINDS: ModelKind[] = ["chat", "embeddings", "image"];

/** Three columns from lg: the row label, then A and B under their cards. */
const columns = "lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)_minmax(0,3fr)]";

const RESET_MS = 2000;

function meta(m: Model): string {
  const parts = [`by ${m.publisher}`, m.quantization];
  if (m.contextK !== null) parts.push(`${formatContext(m.contextK)} context`);
  return parts.join(" · ");
}

function ModelCard({
  side,
  model,
  other,
  onChange,
}: {
  side: Side;
  model: Model;
  other: Model;
  /** Without it (static HTML, before hydration) the select is inert. */
  onChange?: (slug: string) => void;
}) {
  const labelId = useId();
  const inert = !onChange;
  // A lists every model, by kind; B only the models of A's kind.
  const groups =
    side === "a"
      ? KINDS.map((k) => ({ kind: k, list: models.filter((m) => modelKind(m) === k) }))
      : [{ kind: modelKind(other), list: models.filter((m) => modelKind(m) === modelKind(other) && m.slug !== other.slug) }];

  return (
    <div
      data-testid={`compare-card-${side}`}
      className="flex min-w-0 flex-col gap-5 rounded-panel border border-line bg-surface p-5 md:p-6"
    >
      <div className="flex items-center justify-between gap-4">
        <span id={labelId} className="label-mono flex items-center gap-2.5 text-fg-2">
          <SideMark side={side} />
          Model {side.toUpperCase()}
        </span>
        <span className="flex items-center gap-2.5 font-mono text-meta text-fg">
          <StatusDot state="live" />
          Serverless
        </span>
      </div>
      <Select
        value={model.slug}
        disabled={inert}
        onValueChange={(v) => {
          if (v !== model.slug) onChange?.(v);
        }}
      >
        <SelectTrigger
          aria-labelledby={labelId}
          className={cn(
            "h-11 w-full text-ui",
            // Inert only until hydration: keep it looking ready so nothing flashes.
            inert && "disabled:cursor-default disabled:opacity-100",
          )}
        >
          {/* Children render in the static HTML too, where Radix has no item text yet. */}
          <SelectValue>{model.name}</SelectValue>
        </SelectTrigger>
        <SelectContent position="popper" align="start">
          {groups.map((g) => (
            <SelectGroup key={g.kind}>
              {groups.length > 1 && <SelectLabel>{KIND_LABELS[g.kind]}</SelectLabel>}
              {g.list.map((m) => (
                <SelectItem key={m.slug} value={m.slug}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
      <div className="flex flex-col gap-3">
        <p className="font-mono text-meta text-fg-2">{meta(model)}</p>
        <ul aria-label={`${shortModelName(model)} tags`} className="flex flex-wrap gap-2">
          {model.tasks.map((t) => (
            <li key={t}>
              <Badge variant="secondary">{t}</Badge>
            </li>
          ))}
          {model.dedicated && (
            <li>
              <Badge variant="live">dedicated</Badge>
            </li>
          )}
        </ul>
      </div>
      <Link
        href={`/models/${model.slug}/`}
        className="group/link inline-flex w-fit items-center gap-1.5 text-small text-fg-2 hover:text-fg"
      >
        Model page<span className="sr-only">: {model.name}</span>
        <span
          aria-hidden="true"
          className="transition-[translate] duration-150 group-hover/link:translate-x-0.5"
        >
          →
        </span>
      </Link>
    </div>
  );
}

/** The amber mark on the better value, with how much better. */
function Better({ note, className }: { note: string; className?: string }) {
  return (
    <Badge variant="live" className={cn("bg-amber/8", className)}>
      {note}
    </Badge>
  );
}

function GroupTable({ group, a, b }: { group: CompareGroup; a: Model; b: Model }) {
  const titleId = useId();
  return (
    <div data-testid={`compare-group-${group.id}`}>
      <h3 id={titleId} className="label-mono border-b border-line-strong pb-3 text-fg">
        {group.title}
      </h3>
      <div role="table" aria-labelledby={titleId}>
        {/* Visible on phones, where the cards are stacked above; the cards head the columns from md. */}
        <div role="rowgroup">
          <div
            role="row"
            className={cn("grid grid-cols-2 gap-x-6 border-b border-line py-3 md:sr-only", columns)}
          >
            <span role="columnheader" className="sr-only">
              Metric
            </span>
            {([["a", a], ["b", b]] as const).map(([side, m]) => (
              <span
                key={side}
                role="columnheader"
                className="flex min-w-0 items-center gap-2 font-mono text-caption text-fg-2"
              >
                <SideMark side={side} />
                <span className="truncate">{shortModelName(m)}</span>
              </span>
            ))}
          </div>
        </div>
        <div role="rowgroup">
          {group.rows.map((r) => (
            <div
              key={r.label}
              role="row"
              data-row={r.label}
              className={cn(
                "grid grid-cols-2 items-start gap-x-6 gap-y-2 border-b border-line py-4 lg:items-center",
                columns,
              )}
            >
              <span role="rowheader" className="label-mono col-span-2 text-fg-2 lg:col-span-1">
                {r.label}
              </span>
              {(["a", "b"] as const).map((side) => (
                <span
                  key={side}
                  role="cell"
                  data-side={side}
                  className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 font-mono text-meta break-words text-fg"
                >
                  <span className="min-w-0">{r[side]}</span>
                  {r.better === side && r.note && <Better note={r.note} />}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * The two model cards and the table under them, with the pair in the URL.
 * Each Select pushes a history entry (Back returns to the previous pair);
 * Swap pushes the pair reversed; Copy link copies the address.
 */
export function CompareStage() {
  const { a, b, search, hydrated } = useComparePair();
  const [copied, setCopied] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  // A link with an unknown slug, a repeated one or two kinds shows a corrected
  // pair: put that pair in the address bar too, so copying it shares what is on screen.
  useEffect(() => {
    if (!hydrated) return;
    const sp = new URLSearchParams(search);
    if (!sp.has("a") && !sp.has("b")) return;
    const canonical = compareSearch(a.slug, b.slug);
    if (`?${search}` !== canonical) window.history.replaceState(null, "", `${COMPARE_PATH}${canonical}`);
  }, [hydrated, search, a.slug, b.slug]);

  async function onCopy() {
    const ok = await copyText(window.location.href);
    setCopied(ok ? "copied" : "failed");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied("idle"), RESET_MS);
  }

  const groups = compareRows(a, b);

  return (
    <section aria-labelledby="comparing-title" className="border-t border-line py-12 md:py-16">
      <div className="container-site">
        <div className={cn("grid grid-cols-1 gap-6 md:grid-cols-2", columns)}>
          <div className="flex flex-col gap-4 md:col-span-2 lg:col-span-1">
            <h2 id="comparing-title" className="label-mono text-fg-2">
              Comparing
            </h2>
            <p className="max-w-[34rem] text-small text-fg-2">
              Change either model and the link updates, so a comparison can be shared.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!hydrated}
                onClick={() => pushPair(b.slug, a.slug)}
                className="disabled:opacity-100"
              >
                Swap A and B
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={!hydrated}
                onClick={onCopy}
                className={cn(
                  "disabled:opacity-100",
                  copied === "copied" && "text-ok hover:text-ok",
                  copied === "failed" && "text-err hover:text-err",
                )}
              >
                {copied === "copied" ? "Copied" : copied === "failed" ? "Copy failed" : "Copy link"}
              </Button>
              {/* Always mounted so screen readers pick up the change. */}
              <span role="status" aria-live="polite" className="sr-only">
                {copied === "copied" ? "Link copied" : copied === "failed" ? "Copy failed" : ""}
              </span>
            </div>
          </div>
          <ModelCard
            side="a"
            model={a}
            other={b}
            onChange={hydrated ? (slug) => pushPair(slug, b.slug) : undefined}
          />
          <ModelCard
            side="b"
            model={b}
            other={a}
            onChange={hydrated ? (slug) => pushPair(a.slug, slug) : undefined}
          />
        </div>

        <div data-testid="compare-table" className="mt-12 flex flex-col gap-12">
          {groups.map((g) => (
            <GroupTable key={g.id} group={g} a={a} b={b} />
          ))}
        </div>

        <p className="mt-6 text-small text-fg-2">
          <Better note="amber" className="align-middle" /> marks the better number in each row. No mark means they tie.
        </p>
      </div>
    </section>
  );
}
