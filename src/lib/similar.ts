import { models as allModels, isTokenModel, type Model } from "@/data/models";
import { compareNames } from "@/lib/catalog";
import { blendedPrice } from "@/lib/pricing";

/** One comparable price per model: 50/50 blended per 1M tokens, or per image. */
function unitPrice(m: Model): number {
  if (isTokenModel(m)) return blendedPrice(m, 0.5);
  return m.pricing.unit === "image" ? m.pricing.perImage : 0;
}

function priceDistance(a: Model, b: Model): number {
  const pa = unitPrice(a);
  const pb = unitPrice(b);
  if (!(pa > 0) || !(pb > 0)) return Number.POSITIVE_INFINITY;
  return Math.abs(Math.log(pa / pb));
}

/**
 * Models a reader comparing this one would look at next: they share at least
 * one task, those sharing the main task come first, then the closest price.
 * Returns fewer than `limit` rather than padding with unrelated models.
 */
export function similarModels(m: Model, limit = 3, pool: readonly Model[] = allModels): Model[] {
  const [mainTask] = m.tasks;
  return pool
    .filter((c) => c.slug !== m.slug && c.tasks.some((t) => m.tasks.includes(t)))
    .map((c) => ({
      c,
      main: c.tasks.includes(mainTask) ? 0 : 1,
      shared: c.tasks.filter((t) => m.tasks.includes(t)).length,
      distance: priceDistance(m, c),
    }))
    .sort(
      (a, b) =>
        a.main - b.main ||
        b.shared - a.shared ||
        a.distance - b.distance ||
        compareNames(a.c.name, b.c.name),
    )
    .slice(0, limit)
    .map((s) => s.c);
}
