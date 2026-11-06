"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { getGpu, gpuShortName } from "@/data/gpus";
import { contactHref } from "@/data/site";
import { isDedicatedModel, isTokenModel, models, type TokenModel } from "@/data/models";
import { formatCount, formatTokens, formatUsd } from "@/lib/format";
import { shortModelName } from "@/lib/model-display";
import { HOURS_PER_MONTH, PEAK_FACTOR, compareMonthly, type MonthlyComparison } from "@/lib/pricing";
import { SLIDER_MAX_STEP, parseTokenText, stepForTokens, tokensAtStep } from "@/lib/token-scale";
import { cn } from "@/lib/utils";

/**
 * Models the calculator prices: token models that produce output. Embeddings
 * bill input only and images bill per image; both are in the tables below.
 */
const CALC_MODELS = models.filter(isTokenModel).filter((m) => !m.tasks.includes("embeddings"));
const GROUPS = [
  { label: "Dedicated available", list: CALC_MODELS.filter(isDedicatedModel) },
  { label: "Serverless only", list: CALC_MODELS.filter((m) => !isDedicatedModel(m)) },
];
const DEFAULT_SLUG = "llama-3-3-70b";

/** A month a small product team might see: 2B tokens in, 500M out. */
const DEFAULT_INPUT = 2e9;
const DEFAULT_OUTPUT = 500e6;

const TICKS = ["1M", "100M", "10B", "100B"];

function Volume({
  id,
  label,
  testId,
  hintId,
  value,
  onChange,
}: {
  id: string;
  label: string;
  testId: string;
  hintId: string;
  value: number;
  onChange: (tokens: number) => void;
}) {
  // While the person types, the field keeps their text and the result follows
  // the parsed value; on blur (or Enter) the field shows the clamped number.
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor={id} className="label-mono text-fg-2">
          {label}
        </label>
        {/* A plain span, not <output>: that element is a live region, and the summary
            below already announces each settled result once. */}
        <span data-testid={testId} className="font-mono text-small text-fg">
          {formatTokens(value)}
        </span>
      </div>
      <Input
        id={id}
        type="text"
        // A text keypad on phones: the hint invites K, M and B suffixes.
        inputMode="text"
        autoComplete="off"
        spellCheck={false}
        aria-describedby={hintId}
        className="mt-2.5 h-11 font-mono tabular-nums md:text-[0.9375rem]"
        value={draft ?? formatCount(value)}
        onChange={(e) => {
          setDraft(e.target.value);
          onChange(parseTokenText(e.target.value));
        }}
        onBlur={() => setDraft(null)}
        onKeyDown={(e) => {
          if (e.key === "Enter") setDraft(null);
        }}
      />
      <Slider
        className="mt-4"
        min={0}
        max={SLIDER_MAX_STEP}
        step={1}
        value={[stepForTokens(value)]}
        onValueChange={([s]) => {
          setDraft(null);
          onChange(tokensAtStep(s));
        }}
        thumb={{ "aria-label": label, "aria-valuetext": `${formatTokens(value)} tokens` }}
      />
      {/* Ticks sit where those values fall on the log track (the thumb's centre
          travels 8 px in from each end). */}
      <div aria-hidden="true" className="relative mt-1.5 h-4 font-mono text-[0.75rem] text-fg-2">
        {TICKS.map((t, i) => (
          <span
            key={t}
            className={cn(
              "absolute top-0",
              i === 0 ? "left-0" : i === TICKS.length - 1 ? "right-0" : "-translate-x-1/2",
            )}
            style={
              i === 0 || i === TICKS.length - 1
                ? undefined
                : { left: `calc(8px + (100% - 16px) * ${stepForTokens(parseTokenText(t)) / SLIDER_MAX_STEP})` }
            }
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

function Option({
  name,
  cheaper,
  testId,
  value,
  muted,
  children,
}: {
  name: string;
  cheaper: boolean;
  testId: string;
  value: string;
  muted?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col bg-surface-2 p-5 md:p-6">
      <div className="flex items-center justify-between gap-3">
        <h3 className="label-mono font-[450] text-fg-2">{name}</h3>
        {cheaper && <span className="label-mono text-amber">Cheaper</span>}
      </div>
      <p
        data-testid={testId}
        className={cn(
          "mt-4 font-mono leading-none whitespace-nowrap tabular-nums",
          muted
            ? "text-[1.25rem] text-fg-2"
            : "text-[1.875rem] min-[400px]:text-[2.25rem] lg:text-[2rem] xl:text-[2.25rem] 2xl:text-[2.5rem]",
          !muted && (cheaper ? "text-amber" : "text-fg"),
        )}
      >
        {value}
      </p>
      <p className="mt-2 font-mono text-[0.75rem] text-fg-2">{muted ? " " : "per month"}</p>
      <ul className="mt-5 space-y-1 border-t border-line pt-4 font-mono text-[0.8125rem] text-fg-2">
        {children}
      </ul>
    </div>
  );
}

function mixText(c: MonthlyComparison): string {
  if (c.totalTokens === 0) return "at an even input/output mix";
  return `at your mix of ${Math.round(c.inputShare * 100)}% input`;
}

function BreakEven({ model, c }: { model: TokenModel; c: MonthlyComparison }) {
  if (!c.dedicated) {
    return (
      <>
        There is no ready dedicated replica for {shortModelName(model)}. One can be set up on
        request:{" "}
        <Link
          href={contactHref}
          className="text-fg underline decoration-line-strong underline-offset-4 hover:decoration-fg"
        >
          talk to an engineer
        </Link>
        .
      </>
    );
  }
  const blended = `${formatUsd(c.blended)} per 1M blended`;
  if (c.breakEven === null) {
    return (
      <>
        At {blended}, serverless stays cheaper at any volume: a replica fills up before it pays for
        itself.
      </>
    );
  }
  return (
    <>
      One replica pays for itself at{" "}
      <span className="font-mono text-fg">{formatTokens(c.breakEven)} tokens a month</span>,{" "}
      {mixText(c)} ({blended}).
    </>
  );
}

/** How long the result must hold still before it is announced. */
const ANNOUNCE_DELAY_MS = 500;

/**
 * The value, once it has stopped changing for `delay` ms. Dragging the slider
 * or typing a number changes the result many times; a screen reader should
 * hear only where it lands.
 */
function useSettled<T>(value: T, delay: number): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return settled;
}

function announcement(c: MonthlyComparison): string {
  const dedicated = c.dedicated ? `dedicated ${formatUsd(c.dedicated.cost)}` : "no dedicated replica";
  return `Serverless ${formatUsd(c.serverless)}, ${dedicated} a month. ${verdict(c)}`;
}

function verdict(c: MonthlyComparison): string {
  if (!c.dedicated) return "Serverless only: billed per token on shared GPUs.";
  if (c.savings === 0) return "Both cost the same at this volume.";
  const who = c.cheaper === "dedicated" ? "Dedicated" : "Serverless";
  return `${who} saves ${formatUsd(c.savings)} a month at this volume.`;
}

/**
 * The pricing calculator: one model, a month of input and output tokens, and
 * what that month costs on the shared pool and on reserved replicas. Every
 * number comes from compareMonthly, which clamps whatever the fields hold.
 */
export function Calculator() {
  const [slug, setSlug] = useState(DEFAULT_SLUG);
  const [input, setInput] = useState(DEFAULT_INPUT);
  const [output, setOutput] = useState(DEFAULT_OUTPUT);
  const model = CALC_MODELS.find((m) => m.slug === slug) ?? CALC_MODELS[0];
  const c = compareMonthly(model, input, output);
  const announced = useSettled(announcement(c), ANNOUNCE_DELAY_MS);
  const spec = model.dedicated;
  const gpu = spec ? getGpu(spec.gpu) : null;

  return (
    <div
      data-testid="calculator"
      data-cheaper={c.cheaper}
      className="grid grid-cols-1 overflow-hidden rounded-panel border border-line lg:grid-cols-12"
    >
      <div className="flex flex-col gap-8 bg-surface p-5 md:p-8 lg:col-span-5">
        <div>
          <label htmlFor="calc-model" className="label-mono text-fg-2">
            Model
          </label>
          <Select value={model.slug} onValueChange={setSlug}>
            <SelectTrigger id="calc-model" className="mt-2.5 h-11 w-full text-[0.9375rem] data-[size=default]:h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" align="start">
              {GROUPS.map((g) => (
                <SelectGroup key={g.label}>
                  <SelectLabel>{g.label}</SelectLabel>
                  {g.list.map((m) => (
                    <SelectItem key={m.slug} value={m.slug}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
          <p className="mt-2.5 font-mono text-[0.8125rem] text-fg-2">
            {formatUsd(model.pricing.input)} in · {formatUsd(model.pricing.output)} out, per 1M
          </p>
        </div>
        <Volume
          id="calc-input"
          label="Input tokens per month"
          testId="volume-input"
          hintId="calc-volume-hint"
          value={c.inputTokens}
          onChange={setInput}
        />
        <Volume
          id="calc-output"
          label="Output tokens per month"
          testId="volume-output"
          hintId="calc-volume-hint"
          value={c.outputTokens}
          onChange={setOutput}
        />
        <p id="calc-volume-hint" className="-mt-2 text-small text-fg-2">
          Type a number, or use K, M or B (&ldquo;250M&rdquo;). Up to 100B each.
        </p>
      </div>

      <div className="flex min-w-0 flex-col border-t border-line bg-canvas p-5 md:p-8 lg:col-span-7 lg:border-t-0 lg:border-l">
        <div className="flex items-baseline justify-between gap-4">
          <p className="label-mono text-fg-2">Estimated monthly cost</p>
          <p className="label-mono text-fg-2">USD</p>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-px overflow-hidden rounded-panel border border-line bg-line sm:grid-cols-2">
          <Option
            name="Serverless"
            testId="cost-serverless"
            value={formatUsd(c.serverless)}
            // Only a comparison has a cheaper side.
            cheaper={c.dedicated !== null && c.cheaper === "serverless"}
          >
            <li>
              {formatTokens(c.inputTokens)} in × {formatUsd(model.pricing.input)}
            </li>
            <li>
              {formatTokens(c.outputTokens)} out × {formatUsd(model.pricing.output)}
            </li>
            <li>per 1M tokens, no minimums</li>
          </Option>
          {c.dedicated && spec && gpu ? (
            <Option
              name="Dedicated"
              testId="cost-dedicated"
              value={formatUsd(c.dedicated.cost)}
              cheaper={c.cheaper === "dedicated"}
            >
              <li>
                {c.dedicated.replicas} {c.dedicated.replicas === 1 ? "replica" : "replicas"} ×{" "}
                {spec.gpusPerReplica}× {gpuShortName(gpu)}
              </li>
              <li>
                {formatUsd(spec.gpusPerReplica * gpu.hourly)}/hr × {HOURS_PER_MONTH} h
              </li>
              <li>sized for {PEAK_FACTOR}× your average rate</li>
            </Option>
          ) : (
            <Option name="Dedicated" testId="cost-dedicated" value="Serverless only" cheaper={false} muted>
              <li>No ready replica for this model</li>
              <li>Set up on request</li>
            </Option>
          )}
        </div>

        {/* The only live region in the calculator: one announcement per settled change. */}
        <p data-testid="calc-announcement" aria-live="polite" aria-atomic="true" className="sr-only">
          {announced}
        </p>
        <p data-testid="verdict" className="mt-6 text-[1.0625rem] text-fg">
          {verdict(c)}
        </p>
        <p data-testid="break-even" className="mt-2 max-w-[36rem] text-small text-fg-2">
          <BreakEven model={model} c={c} />
        </p>
        <div className="mt-auto pt-6">
          <p className="border-t border-line pt-4 font-mono text-[0.75rem] text-fg-2">
            {formatTokens(c.totalTokens)} tokens a month. Estimates before taxes and the free credit.
          </p>
        </div>
      </div>
    </div>
  );
}
