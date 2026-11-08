/*
 * Number formatting without `Intl`. The first `Intl.NumberFormat` (or
 * `localeCompare`) pays for ICU initialisation on the main thread, which is
 * the biggest app-side cost of loading a page, so everything here is plain
 * string work. The output matches `Intl.NumberFormat("en-US")`: it rounds the
 * shortest decimal that reads back as the same number (so 1.005 is "1.01", as
 * Intl has it, where `toFixed` says "1.00"), half away from zero.
 */

/** A positive finite number as decimal digits: value = 0.<digits> x 10^point. */
function decimal(v: number): { digits: string; point: number } {
  const m = /^(\d+)(?:\.(\d+))?(?:e([+-]\d+))?$/.exec(String(v));
  if (!m) return { digits: "0", point: 1 };
  const all = m[1] + (m[2] ?? "");
  const lead = all.length - all.replace(/^0+/, "").length;
  const digits = all.slice(lead).replace(/0+$/, "") || "0";
  return { digits, point: m[1].length + Number(m[3] ?? 0) - lead };
}

/** Adds one to a string of decimal digits ("199" becomes "200", "99" becomes "100"). */
function increment(digits: string): string {
  let i = digits.length - 1;
  while (i >= 0 && digits[i] === "9") i -= 1;
  const head = i < 0 ? "1" : digits.slice(0, i) + String(Number(digits[i]) + 1);
  return head + "0".repeat(digits.length - 1 - i);
}

/** Puts a comma between each group of three digits: "1234567" becomes "1,234,567". */
function group(int: string): string {
  let out = "";
  for (let i = 0; i < int.length; i += 1) {
    if (i > 0 && (int.length - i) % 3 === 0) out += ",";
    out += int[i];
  }
  return out;
}

/** A positive number with exactly `places` decimals and thousands separators: "3,635.40". */
function fixed(v: number, places: number): string {
  const { digits, point } = decimal(v);
  // The digits of v x 10^places as an integer, rounded half up on the first dropped digit.
  const keep = point + places;
  let n: string;
  if (keep >= digits.length) n = digits + "0".repeat(keep - digits.length);
  else if (keep < 0) n = "0";
  else {
    n = digits.slice(0, keep) || "0";
    if (digits[keep] >= "5") n = increment(n);
  }
  n = n.padStart(places + 1, "0");
  const int = group(n.slice(0, n.length - places));
  return places > 0 ? `${int}.${n.slice(n.length - places)}` : int;
}

/** A positive number to `sig` significant digits, trailing zeros dropped, never in exponent form. */
function significant(v: number, sig: number): string {
  let { digits, point } = decimal(v);
  if (digits.length > sig) {
    const up = digits[sig] >= "5";
    digits = digits.slice(0, sig);
    if (up) {
      const next = increment(digits);
      if (next.length > digits.length) point += 1;
      digits = next.slice(0, sig);
    }
    digits = digits.replace(/0+$/, "") || "0";
  }
  if (point <= 0) return `0.${"0".repeat(-point)}${digits}`;
  if (point >= digits.length) return group(digits + "0".repeat(point - digits.length));
  return `${group(digits.slice(0, point))}.${digits.slice(point)}`;
}

/** "$68.40", "$3,635.40"; two significant digits below one cent ("$0.00041"). */
export function formatUsd(v: number): string {
  if (!Number.isFinite(v) || v <= 0) return "$0.00";
  if (v >= 0.01) return `$${fixed(v, 2)}`;
  return `$${significant(v, 2)}`;
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

/** "212 ms" below one second; seconds with one decimal from there ("5.6 s", "2 s"). */
export function formatLatency(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "0 ms";
  const rounded = Math.round(ms);
  if (rounded < 1000) return `${rounded} ms`;
  return `${Number((ms / 1000).toFixed(1))} s`;
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

/** A whole count with thousands separators: "100,000,000"; "0" for anything not a positive number. */
export function formatCount(v: number): string {
  if (!Number.isFinite(v) || v <= 0) return "0";
  return fixed(Math.round(v), 0);
}
