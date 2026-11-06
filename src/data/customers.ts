/**
 * Invented customers for the logo strip. Every name was searched on the web on
 * 2026-11-06 to make sure it is not a real software or AI company (the search
 * log is in the pull request that added them). The wordmarks are drawn as
 * paths in one gray (#6d7770), so they render the same everywhere.
 *
 * `width` and `height` are the SVG's viewBox size; the strip scales them
 * together, so each mark keeps its proportions and no layout shifts on load.
 */
export interface Customer {
  name: string;
  logo: string;
  width: number;
  height: number;
}

export const customers: Customer[] = [
  { name: "Tidewright", logo: "/logos/tidewright.svg", width: 177.91, height: 27.33 },
  { name: "Quillfern", logo: "/logos/quillfern.svg", width: 168.46, height: 32 },
  { name: "Sablegate", logo: "/logos/sablegate.svg", width: 185.95, height: 18.05 },
  { name: "Vantrell", logo: "/logos/vantrell.svg", width: 143.19, height: 22.6 },
  { name: "Kettleby", logo: "/logos/kettleby.svg", width: 145.14, height: 27.21 },
  { name: "Ardentry", logo: "/logos/ardentry.svg", width: 151.9, height: 23.06 },
  { name: "Brackwater", logo: "/logos/brackwater.svg", width: 178.71, height: 20.3 },
];
