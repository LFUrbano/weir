import type { Metadata, Viewport } from "next";
import { Azeret_Mono, Funnel_Display, Funnel_Sans } from "next/font/google";
import { Footer } from "@/components/site/Footer";
import { CommandMenuProvider } from "@/components/site/CommandMenu";
import { Header } from "@/components/site/Header";
import { TooltipProvider } from "@/components/ui/tooltip";
import { siteUrl } from "@/data/site";
import { HOME_TITLE, SITE_NAME, pageTitle, siteDescription, siteShareImage } from "@/lib/metadata";
import "./globals.css";

const funnelDisplay = Funnel_Display({
  variable: "--font-funnel-display",
  subsets: ["latin"],
  display: "swap",
});

const funnelSans = Funnel_Sans({
  variable: "--font-funnel-sans",
  subsets: ["latin"],
  display: "swap",
});

const azeretMono = Azeret_Mono({
  variable: "--font-azeret-mono",
  subsets: ["latin"],
  display: "swap",
});

/**
 * Defaults for pages without their own metadata (the 404). Every routed page
 * sets its full set with pageMetadata(), canonical URL included.
 */
export const metadata: Metadata = {
  title: {
    default: HOME_TITLE,
    template: pageTitle("%s"),
  },
  description: siteDescription,
  metadataBase: siteUrl,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    images: [{ ...siteShareImage, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", images: [siteShareImage.url] },
};

export const viewport: Viewport = {
  themeColor: "#0c0e0d",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`dark ${funnelDisplay.variable} ${funnelSans.variable} ${azeretMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="sr-only z-50 rounded-md bg-amber px-3 py-2 text-[0.875rem] font-medium text-amber-ink focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Skip to content
        </a>
        <TooltipProvider>
          <CommandMenuProvider>
            <Header />
            <main id="main" className="flex flex-1 flex-col">
              {children}
            </main>
            <Footer />
          </CommandMenuProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
