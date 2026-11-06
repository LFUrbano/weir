const usd = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const usdSmall = new Intl.NumberFormat("en-US", {
  maximumSignificantDigits: 2,
});

/** "$68.40", "$3,635.40"; two significant digits below one cent ("$0.00041"). */
export function formatUsd(v: number): string {
  if (!Number.isFinite(v) || v <= 0) return "$0.00";
  if (v >= 0.01) return `$${usd.format(v)}`;
  return `$${usdSmall.format(v)}`;
}

const SUFFIXES = [
  { size: 1e12, suffix: "T" },
  { size: 1e9, suffix: "B" },
  { size: 1e6, suffix: "M" },
  { size: 1e3, suffix: "K" },
];

/** Three significant digits, trailing zeros stripped: "5.77B", "120M", "2.5K". */
export function formatTokens(v: number): string {
  if (!Number.isFinite(v) || v <= 0) return "0";
  if (v < 1000) return String(Math.round(v));
  let i = SUFFIXES.findIndex((u) => v >= u.size);
  let scaled = Number((v / SUFFIXES[i].size).toPrecision(3));
  if (scaled >= 1000 && i > 0) {
    i -= 1;
    scaled = Number((v / SUFFIXES[i].size).toPrecision(3));
  }
  return `${scaled}${SUFFIXES[i].suffix}`;
}

/** "212 ms" below one second; seconds with up to two decimals from there ("1.34 s"). */
export function formatLatency(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "0 ms";
  const rounded = Math.round(ms);
  if (rounded < 1000) return `${rounded} ms`;
  return `${Number((ms / 1000).toFixed(2))} s`;
}

/** Price per generated image, up to three decimals with trailing zeros stripped: "$0.025". */
export function formatPerImage(v: number): string {
  if (!Number.isFinite(v) || v <= 0) return "$0";
  return `$${Number(v.toFixed(3))}`;
}

/** Context window from thousands of tokens: "128K", "1M", "10M"; "—" when there is none. */
export function formatContext(k: number | null): string {
  if (k === null || !Number.isFinite(k) || k <= 0) return "—";
  if (k >= 1000) return `${Number((k / 1000).toPrecision(3))}M`;
  return `${Math.round(k)}K`;
}

const count = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

/** A whole count with thousands separators: "100,000,000"; "0" for anything not a positive number. */
export function formatCount(v: number): string {
  if (!Number.isFinite(v) || v <= 0) return "0";
  return count.format(Math.round(v));
}
