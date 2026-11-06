import { minutesAgo } from "@/lib/metrics";

/**
 * The chart's table view: every 15-minute step, newest first, behind a
 * disclosure so it never gates the page. The scroll box is focusable so the
 * keyboard can scroll it.
 */
export function MetricsTable({
  times,
  columns,
}: {
  times: number[];
  columns: { name: string; values: string[] }[];
}) {
  const order = times.map((_, i) => i).reverse();
  return (
    <details className="group mt-10 border-t border-line pt-4">
      <summary className="inline-flex cursor-pointer items-center gap-2 rounded-sm font-mono text-small text-fg-2 select-none hover:text-fg [&::-webkit-details-marker]:hidden">
        <span aria-hidden="true" className="transition-transform duration-150 group-open:rotate-90">
          ›
        </span>
        Show the data
      </summary>
      <div
        tabIndex={0}
        role="region"
        aria-label="Metrics data table"
        className="mt-4 max-h-80 overflow-y-auto rounded-md border border-line"
      >
        <table className="w-full border-separate border-spacing-0 font-mono text-[0.8125rem]">
          <caption className="sr-only">
            Median of each 15-minute step over the last 24 hours, newest first
          </caption>
          <thead>
            <tr>
              <th scope="col" className="sticky top-0 border-b border-line bg-surface-2 px-3 py-2 text-left font-normal text-fg-2">
                Step
              </th>
              {columns.map((c) => (
                <th
                  key={c.name}
                  scope="col"
                  className="sticky top-0 border-b border-line bg-surface-2 px-3 py-2 text-right font-normal text-fg-2"
                >
                  {c.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {order.map((i) => (
              <tr key={times[i]}>
                <th scope="row" className="border-b border-line px-3 py-1.5 text-left font-normal text-fg-2">
                  {minutesAgo(times[i])}
                </th>
                {columns.map((c) => (
                  <td key={c.name} className="border-b border-line px-3 py-1.5 text-right text-fg">
                    {c.values[i]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
