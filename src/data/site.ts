export type SiteRoute = "/models/" | "/pricing/" | "/enterprise/" | "/docs/quickstart/";

export type NavItem = { label: string; href: SiteRoute };

export const siteNav: NavItem[] = [
  { label: "Models", href: "/models/" },
  { label: "Pricing", href: "/pricing/" },
  { label: "Enterprise", href: "/enterprise/" },
  { label: "Docs", href: "/docs/quickstart/" },
];

export const primaryCta = { label: "Get an API key", href: "/docs/quickstart/" } as const;

export type FooterColumn = { title: string; links: { label: string; href: SiteRoute | "/" }[] };

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
      { label: "Home", href: "/" },
      { label: "Enterprise", href: "/enterprise/" },
    ],
  },
];

export const fictionNote = "Fictional company. Concept project.";
