export type SiteRoute = "/models/" | "/pricing/" | "/enterprise/" | "/docs/quickstart/";

export type NavItem = { label: string; href: SiteRoute };

export const siteNav: NavItem[] = [
  { label: "Models", href: "/models/" },
  { label: "Pricing", href: "/pricing/" },
  { label: "Enterprise", href: "/enterprise/" },
  { label: "Docs", href: "/docs/quickstart/" },
];

/** Pages the command menu (Cmd+K / Ctrl+K) lists, with the words it also matches. */
export const commandPages: { label: string; href: SiteRoute; keywords: string[] }[] = [
  { label: "Models", href: "/models/", keywords: ["catalog", "browse"] },
  { label: "Pricing", href: "/pricing/", keywords: ["cost", "calculator", "dedicated"] },
  { label: "Enterprise", href: "/enterprise/", keywords: ["sales", "contact", "sla", "security"] },
  { label: "Quickstart", href: "/docs/quickstart/", keywords: ["docs", "api key", "sdk"] },
];

export const primaryCta = { label: "Get an API key", href: "/docs/quickstart/" } as const;

export type FooterColumn = { title: string; links: { label: string; href: SiteRoute }[] };

export const footerColumns: FooterColumn[] = [
  {
    title: "Product",
    links: [
      { label: "Models", href: "/models/" },
      { label: "Pricing", href: "/pricing/" },
      { label: "Quickstart", href: "/docs/quickstart/" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Enterprise", href: "/enterprise/" },
      { label: "Talk to an engineer", href: "/enterprise/" },
    ],
  },
];

export const fictionNote = "Fictional company. Concept project.";
