"use client";

import { AnimatePresence, LazyMotion, type FeatureBundle } from "motion/react";
import { create, li as MotionLi } from "motion/react-m";
import {
  memo,
  startTransition,
  useEffect,
  useState,
  useSyncExternalStore,
  type ComponentProps,
  type ReactNode,
} from "react";
import { IntentLink } from "@/components/site/IntentLink";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableRowHeader,
} from "@/components/ui/table";
import type { Model, Task } from "@/data/models";
import type { SortKey } from "@/lib/catalog";
import { formatContext, formatLatency } from "@/lib/format";
import { modelPrice, modelSpeed } from "@/lib/model-display";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";
import { cn } from "@/lib/utils";
import { loadRowFeatures, ROW_ENTER, ROW_MOVE, rowVariants } from "./row-motion";
import { numCell } from "./table-styles";

const MotionRow = create(TableRow);

/**
 * Props for one animated row. Without motion (static HTML, hydration, before
 * the features load, reduced motion) a row gets none, so it renders as a
 * plain element with no inline style.
 */
function rowMotion(on: boolean) {
  if (!on) return {};
  return {
    layout: "position" as const,
    variants: rowVariants,
    initial: "hidden",
    animate: "shown",
    exit: "gone",
    transition: { ...ROW_ENTER, layout: ROW_MOVE },
  };
}

const href = (m: Model) => `/models/${m.slug}/` as const;

/** Tasks as mono text; the one being filtered on reads brighter than the rest. */
function Tasks({ model, active }: { model: Model; active: Task | "all" }) {
  return (
    <>
      {model.tasks.map((t, i) => (
        <span key={t}>
          {i > 0 && <span aria-hidden="true"> · </span>}
          <span className={t === active ? "text-fg" : undefined}>{t}</span>
        </span>
      ))}
    </>
  );
}

type AriaSort = ComponentProps<"th">["aria-sort"];

/**
 * The one header that shows the sort, and how it is announced. Price order is
 * a 50/50 blend of input and output, so it sits on the input column as "other"
 * (sorted, but not by that column's value alone).
 */
function sortState(sort: SortKey, column: "name" | "input" | "output" | "speed" | "context"): AriaSort {
  if (sort === "name" && column === "name") return "ascending";
  if (sort === "speed" && column === "speed") return "descending";
  if (sort === "context" && column === "context") return "descending";
  if (sort === "price" && column === "input") return "other";
  return undefined;
}

function SortGlyph({ state }: { state: AriaSort }) {
  if (!state) return null;
  return (
    <span aria-hidden="true" className="ml-1.5 text-fg">
      {state === "descending" ? "↓" : "↑"}
    </span>
  );
}

const sticky = "sticky top-(--header-h) z-10 bg-canvas";

function Head({
  sort,
  column,
  className,
  children,
}: {
  sort: SortKey;
  column?: "name" | "input" | "output" | "speed" | "context";
  className?: string;
  children: ReactNode;
}) {
  const state = column ? sortState(sort, column) : undefined;
  return (
    <TableHead
      scope="col"
      aria-sort={state}
      className={cn(sticky, state && "text-fg", className)}
    >
      {children}
      <SortGlyph state={state} />
    </TableHead>
  );
}

function PriceCells({ model }: { model: Model }) {
  const price = modelPrice(model);
  if (price.unit === "image") {
    return (
      <TableCell colSpan={2} className={cn(numCell, "whitespace-nowrap")}>
        {price.perImage}
      </TableCell>
    );
  }
  return (
    <>
      <TableCell className={numCell}>{price.input}</TableCell>
      <TableCell className={cn(numCell, price.output === "—" && "text-fg-2")}>{price.output}</TableCell>
    </>
  );
}

/** One row's cells; memoized so turning motion on does not render them again. */
const DesktopCells = memo(function DesktopCells({ model: m, task }: { model: Model; task: Task | "all" }) {
  return (
    <>
      <TableRowHeader className="py-4 pr-3">
        <IntentLink
          href={href(m)}
          className="font-medium text-fg outline-offset-4 after:absolute after:inset-0 after:content-['']"
        >
          {m.name}
        </IntentLink>
        <span className="mt-1 block text-small text-fg-2">
          {m.publisher}
          <span className="font-mono text-meta lg:hidden">
            {" · "}
            <Tasks model={m} active={task} />
          </span>
        </span>
      </TableRowHeader>
      <TableCell className="hidden font-mono text-meta text-fg-2 lg:table-cell">
        <Tasks model={m} active={task} />
      </TableCell>
      <TableCell className={cn(numCell, m.contextK === null && "text-fg-2")}>
        {formatContext(m.contextK)}
      </TableCell>
      <PriceCells model={m} />
      <TableCell className={cn(numCell, "whitespace-nowrap", m.tokensPerSec === null && "text-fg-2")}>
        {modelSpeed(m)}
      </TableCell>
      <TableCell className={cn(numCell, "whitespace-nowrap")}>{formatLatency(m.p50Ms)}</TableCell>
      <TableCell
        aria-hidden="true"
        className="hidden pl-3 text-right font-mono text-fg-2 transition-[color,translate] duration-150 group-hover:translate-x-0.5 group-hover:text-fg lg:table-cell"
      >
        →
      </TableCell>
    </>
  );
});

function DesktopTable({ list, task, sort, on, typing }: ListProps & { sort: SortKey }) {
  return (
    <Table data-testid="catalog-table" data-motion={on ? "on" : undefined} className="hidden md:table">
      <caption className="sr-only">
        Models with price, context window, decode speed and median time to first token
      </caption>
      <TableHeader>
        <TableRow>
          <Head sort={sort} column="name">
            Model
          </Head>
          <Head sort={sort} className="hidden lg:table-cell">
            Task
          </Head>
          <Head sort={sort} column="context" className="text-right">
            Context
          </Head>
          <Head sort={sort} column="input" className="text-right">
            Input / 1M
          </Head>
          <Head sort={sort} column="output" className="text-right">
            Output / 1M
          </Head>
          <Head sort={sort} column="speed" className="text-right">
            Speed
          </Head>
          <Head sort={sort} className="text-right">
            p50
          </Head>
          {/* The arrow column is decoration (each row's link is the model name). */}
          <TableHead aria-hidden="true" className={cn(sticky, "hidden w-8 lg:table-cell")} />
        </TableRow>
      </TableHeader>
      <TableBody>
        <AnimatePresence initial={false} custom={typing}>
          {list.map((m) => (
            <MotionRow
              key={m.slug}
              data-slug={m.slug}
              data-tasks={m.tasks.join(" ")}
              className="group relative hover:bg-surface"
              {...rowMotion(on)}
            >
              <DesktopCells model={m} task={task} />
            </MotionRow>
          ))}
        </AnimatePresence>
      </TableBody>
    </Table>
  );
}

function Spec({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <dt className="label-mono text-fg-2">{label}</dt>
      <dd
        className={cn(
          "mt-1.5 font-mono text-small whitespace-nowrap tabular-nums",
          value === "—" ? "text-fg-2" : "text-fg",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

/** One card's content; memoized so turning motion on does not render it again. */
const PhoneCard = memo(function PhoneCard({ model: m, task }: { model: Model; task: Task | "all" }) {
  const price = modelPrice(m);
  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <IntentLink
            href={href(m)}
            className="font-medium text-fg outline-offset-4 after:absolute after:inset-0 after:content-['']"
          >
            {m.name}
          </IntentLink>
          <p className="mt-1 text-small text-fg-2">
            {m.publisher}
            <span className="font-mono text-meta">
              {" · "}
              <Tasks model={m} active={task} />
            </span>
          </p>
        </div>
        <span aria-hidden="true" className="font-mono text-fg-2">
          →
        </span>
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-x-4 gap-y-4">
        {price.unit === "image" ? (
          <Spec label="Price" value={price.perImage} className="col-span-2" />
        ) : (
          <>
            <Spec label="Input / 1M" value={price.input} />
            <Spec label="Output / 1M" value={price.output} />
          </>
        )}
        <Spec label="p50" value={formatLatency(m.p50Ms)} />
        <Spec label="Context" value={formatContext(m.contextK)} />
        <Spec label="Speed" value={modelSpeed(m)} />
      </dl>
    </>
  );
});

function PhoneCards({ list, task, on, typing }: ListProps) {
  return (
    <ul
      data-testid="catalog-cards"
      data-motion={on ? "on" : undefined}
      aria-label="Models"
      className="border-t border-line-strong md:hidden"
    >
      <AnimatePresence initial={false} custom={typing}>
        {list.map((m) => (
          <MotionLi
            key={m.slug}
            data-slug={m.slug}
            data-tasks={m.tasks.join(" ")}
            className="group relative border-b border-line py-5"
            {...rowMotion(on)}
          >
            <PhoneCard model={m} task={task} />
          </MotionLi>
        ))}
      </AnimatePresence>
    </ul>
  );
}

interface ListProps {
  list: Model[];
  task: Task | "all";
  /** Rows animate (motion features loaded, no reduced motion, this layout on screen). */
  on: boolean;
  /** The last change came from the search box: leaving rows go at once. */
  typing: boolean;
}

/** Tailwind's md breakpoint: the table from here up, the cards below. */
const MD = "(min-width: 48rem)";

function subscribeMd(onChange: () => void) {
  const mq = window.matchMedia(MD);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

/** Whether the table (not the cards) is the layout on screen. */
function useTableShown(): boolean {
  return useSyncExternalStore(
    subscribeMd,
    () => window.matchMedia(MD).matches,
    () => false,
  );
}

/**
 * What LazyMotion gets until the features load: no renderer, so the rows
 * render as plain elements.
 */
const NO_FEATURES = {} as FeatureBundle;

/**
 * Motion's features once the rows may animate: after the reader shows intent
 * on the controls (wantRowFeatures) and the chunk has loaded, never with
 * reduced motion. Turning reduced motion off mid-session does not fetch the
 * features: rows stay still until the next load, by design.
 *
 * The bundle is handed to LazyMotion as a plain object from this state, not as
 * LazyMotion's own async loader: that loader is called once on mount and its
 * result lands in a render React cannot interrupt. Here the switch is one
 * transition, so the rows becoming motion elements renders in slices and
 * yields to the reader's input.
 */
function useRowFeatures(): FeatureBundle | null {
  const reduced = usePrefersReducedMotion();
  const [features, setFeatures] = useState<FeatureBundle | null>(null);
  useEffect(() => {
    if (reduced) return;
    let live = true;
    void loadRowFeatures().then((loaded) => {
      if (live) startTransition(() => setFeatures(loaded));
    });
    return () => {
      live = false;
    };
  }, [reduced]);
  return reduced ? null : features;
}

/**
 * The catalog list: a table from md up, one card per model on phones.
 *
 * When the list is filtered or sorted, rows that leave fade out, rows that
 * join rise in, and the rest slide to their new places. The static HTML and
 * hydration render plain rows (nothing animates on load); Motion's features
 * load on the reader's first intent on the controls, never with reduced motion.
 */
export function CatalogTable({ list, task, sort }: { list: Model[]; task: Task | "all"; sort: SortKey }) {
  const features = useRowFeatures();
  const on = features !== null;
  // Only the layout on screen animates: the hidden one's rows get no motion
  // props, so they run no layout projection and leave at once.
  const tableShown = useTableShown();
  // A new list with the same task and sort came from the search box.
  const [last, setLast] = useState({ list, task, sort, typing: false });
  if (last.list !== list || last.task !== task || last.sort !== sort) {
    setLast({ list, task, sort, typing: last.task === task && last.sort === sort });
  }
  const { typing } = last;

  return (
    <LazyMotion features={features ?? NO_FEATURES}>
      <DesktopTable list={list} task={task} sort={sort} on={on && tableShown} typing={typing} />
      <PhoneCards list={list} task={task} on={on && !tableShown} typing={typing} />
    </LazyMotion>
  );
}
