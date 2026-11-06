/**
 * Axis ticks from zero to at least `max`, three to five intervals, each a 1, 2
 * or 5 times a power of ten. Latency and speed axes start at zero so a spike
 * reads at its real size.
 */
export function niceTicks(max: number, intervals = 4): number[] {
  if (!Number.isFinite(max) || max <= 0) return [0, 1];
  const rough = max / intervals;
  const power = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 5, 10].map((f) => f * power).find((s) => s >= rough) ?? 10 * power;
  const top = Math.ceil(max / step - 1e-9) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= top + step / 2; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
  return ticks;
}
