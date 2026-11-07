import Link from "next/link";
import { numCell } from "@/components/models/table-styles";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableRowHeader,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getGpu, gpuShortName, gpus, type Gpu } from "@/data/gpus";
import { IMAGE_SIZE, isDedicatedModel, isTokenModel, models, type Model } from "@/data/models";
import { formatCount, formatPerImage, formatUsd } from "@/lib/format";
import { BREAK_EVEN_LABEL, BREAK_EVEN_NOTE, formatBreakEven, modelPrice } from "@/lib/model-display";
import { HOURS_PER_MONTH, breakEvenMonthlyTokens, dedicatedMonthlyCost } from "@/lib/pricing";
import { cn } from "@/lib/utils";

/*
 * The price tables are plain server-rendered HTML. Every value is read from
 * models.ts and gpus.ts through the same helpers as the catalog and the model
 * pages, so the numbers cannot drift apart.
 */

const perHour = (v: number) => `${formatUsd(v)}/hr`;

/** "2× H100", or "Serverless only" for models without a ready replica. */
function replicaLabel(m: Model): string {
  if (!isDedicatedModel(m)) return "Serverless only";
  return `${m.dedicated.gpusPerReplica}× ${gpuShortName(getGpu(m.dedicated.gpu))}`;
}

function ModelName({ model, sub }: { model: Model; sub?: string }) {
  return (
    <>
      <Link
        href={`/models/${model.slug}/`}
        className="font-medium text-fg underline decoration-transparent underline-offset-4 transition-colors hover:decoration-fg-2"
      >
        {model.name}
      </Link>
      <span className="mt-1 block text-small text-fg-2">{model.publisher}</span>
      {/* On phones the replica column folds in under the name. */}
      {sub && <span className="mt-0.5 block font-mono text-meta text-fg-2 md:hidden">{sub}</span>}
    </>
  );
}

/** A column header that is shorter on phones, where the table has the least room. */
function Short({ phone, full }: { phone: string; full: string }) {
  return (
    <>
      <span className="md:hidden">{phone}</span>
      <span className="hidden md:inline">{full}</span>
    </>
  );
}

/**
 * The break-even header, with its meaning one focus or hover away. The trigger
 * is a real button, so the keyboard reaches it. The tooltip is extra: the
 * definition is the button's description at all times, so a screen reader
 * hears it and a touch screen (where tooltips do not open) loses nothing.
 */
function BreakEvenHead() {
  return (
    <>
      <Tooltip>
        <TooltipTrigger
          type="button"
          aria-describedby="break-even-note"
          className="cursor-help rounded-sm uppercase underline decoration-line-strong decoration-dotted underline-offset-4 hover:text-fg focus-visible:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <Short phone="Break-even" full={BREAK_EVEN_LABEL} />
        </TooltipTrigger>
        {/* The sticky site header covers the top 64 px: flip below before reaching it. */}
        <TooltipContent
          side="top"
          collisionPadding={{ top: 80, left: 16, right: 16 }}
          className="max-w-64 font-sans text-small normal-case"
        >
          {BREAK_EVEN_NOTE}
        </TooltipContent>
      </Tooltip>
      <span id="break-even-note" hidden>
        {BREAK_EVEN_NOTE}
      </span>
    </>
  );
}

const nameCell = "py-3.5 pr-3 align-top md:align-middle";
const num = cn(numCell, "whitespace-nowrap align-top md:align-middle py-3.5");
const quiet = "text-fg-2";

const tokenModels = models.filter(isTokenModel);
const imageModels = models.filter((m) => m.pricing.unit === "image");
const dedicatedModels = models.filter(isDedicatedModel);

/** Serverless price per 1M tokens: one row per token model. */
export function ServerlessTable() {
  return (
    <Table data-testid="serverless-table">
      <caption className="sr-only">
        Serverless price per 1M tokens for every token model, in USD, and whether it has a dedicated
        replica
      </caption>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">Model</TableHead>
          <TableHead scope="col" className="hidden lg:table-cell">
            Task
          </TableHead>
          <TableHead scope="col" className="text-right">
            <Short phone="In / 1M" full="Input / 1M" />
          </TableHead>
          <TableHead scope="col" className="text-right max-md:pr-0">
            <Short phone="Out / 1M" full="Output / 1M" />
          </TableHead>
          <TableHead scope="col" className="hidden text-right md:table-cell">
            Dedicated
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tokenModels.map((m) => {
          const price = modelPrice(m);
          if (price.unit !== "tokens") return null;
          return (
            <TableRow key={m.slug} data-slug={m.slug} className="hover:bg-surface">
              <TableRowHeader className={nameCell}>
                <ModelName
                  model={m}
                  sub={isDedicatedModel(m) ? `${replicaLabel(m)} replica` : "serverless only"}
                />
              </TableRowHeader>
              <TableCell className="hidden font-mono text-meta text-fg-2 lg:table-cell">
                {m.tasks.join(" · ")}
              </TableCell>
              <TableCell data-col="input" className={num}>
                {price.input}
              </TableCell>
              <TableCell
                data-col="output"
                className={cn(num, "max-md:pr-0", price.output === "—" && quiet)}
              >
                {price.output}
              </TableCell>
              <TableCell
                data-col="dedicated"
                className={cn(num, "hidden md:table-cell", !isDedicatedModel(m) && quiet)}
              >
                {replicaLabel(m)}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

/** Image models bill one price per generated image. */
export function ImageTable() {
  return (
    <Table data-testid="image-table">
      <caption className="sr-only">Serverless price per generated image, in USD</caption>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">Image model</TableHead>
          <TableHead scope="col" className="text-right">
            Size
          </TableHead>
          <TableHead scope="col" className="text-right">
            Per image
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {imageModels.map((m) =>
          m.pricing.unit === "image" ? (
            <TableRow key={m.slug} data-slug={m.slug} className="hover:bg-surface">
              <TableRowHeader className={nameCell}>
                <ModelName model={m} />
              </TableRowHeader>
              <TableCell className={cn(num, quiet)}>{IMAGE_SIZE.label}</TableCell>
              <TableCell className={num}>{formatPerImage(m.pricing.perImage)}</TableCell>
            </TableRow>
          ) : null,
        )}
      </TableBody>
    </Table>
  );
}

/** "3 models" with a ready replica on this GPU, or "On request". */
export function readyCount(g: Gpu): string {
  const n = dedicatedModels.filter((m) => m.dedicated.gpu === g.id).length;
  if (n === 0) return "On request";
  return `${n} ${n === 1 ? "model" : "models"}`;
}

/** Dedicated GPU rates: per GPU-hour, billed by the second. */
export function GpuTable() {
  return (
    <Table data-testid="gpu-table">
      <caption className="sr-only">Dedicated GPU rates in USD per GPU-hour</caption>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">GPU</TableHead>
          <TableHead scope="col" className="text-right">
            Memory
          </TableHead>
          <TableHead scope="col" className="text-right max-md:pr-0">
            Per GPU-hour
          </TableHead>
          <TableHead scope="col" className="hidden text-right md:table-cell">
            {HOURS_PER_MONTH} h month
          </TableHead>
          <TableHead scope="col" className="hidden text-right md:table-cell">
            Ready replicas
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {gpus.map((g) => (
          <TableRow key={g.id} data-gpu={g.id} className="hover:bg-surface">
            <TableRowHeader className="py-4 pr-3 font-medium text-fg">{g.name}</TableRowHeader>
            <TableCell className={cn(num, quiet)}>{g.memoryGb} GB</TableCell>
            <TableCell className={cn(num, "max-md:pr-0")}>{perHour(g.hourly)}</TableCell>
            <TableCell className={cn(num, "hidden md:table-cell")}>
              {formatUsd(g.hourly * HOURS_PER_MONTH)}
            </TableCell>
            <TableCell className={cn(num, "hidden md:table-cell", quiet)}>{readyCount(g)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/**
 * Models with a ready dedicated replica: its shape, its rate, what one replica
 * costs for a month, and where it pays for itself at an even input/output mix
 * (the same assumption, and the same number, as each model page).
 */
export function ReplicaTable() {
  return (
    <Table data-testid="replica-table">
      <caption className="sr-only">
        Dedicated replicas per model: GPUs, rate per hour, monthly cost of one replica, peak throughput
        and break-even volume at an even input and output mix
      </caption>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">Model</TableHead>
          <TableHead scope="col" className="hidden text-right md:table-cell">
            Replica
          </TableHead>
          <TableHead scope="col" className="text-right">
            Per hour
          </TableHead>
          <TableHead scope="col" className="hidden text-right md:table-cell">
            Per month
          </TableHead>
          <TableHead scope="col" className="hidden text-right lg:table-cell">
            Peak
          </TableHead>
          <TableHead scope="col" className="text-right">
            <BreakEvenHead />
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {dedicatedModels.map((m) => {
          const g = getGpu(m.dedicated.gpu);
          const breakEven = breakEvenMonthlyTokens(m, 0.5);
          return (
            <TableRow key={m.slug} data-slug={m.slug} className="hover:bg-surface">
              <TableRowHeader className={nameCell}>
                <ModelName model={m} sub={replicaLabel(m)} />
              </TableRowHeader>
              <TableCell className={cn(num, "hidden md:table-cell")}>{replicaLabel(m)}</TableCell>
              <TableCell className={num}>{perHour(m.dedicated.gpusPerReplica * g.hourly)}</TableCell>
              <TableCell className={cn(num, "hidden md:table-cell")}>
                {formatUsd(dedicatedMonthlyCost(m, 0))}
              </TableCell>
              <TableCell className={cn(num, "hidden lg:table-cell", quiet)}>
                {formatCount(m.dedicated.replicaTokensPerSec)} tok/s
              </TableCell>
              <TableCell className={cn(num, breakEven === null && quiet)}>
                {breakEven === null ? "—" : formatBreakEven(breakEven)}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
