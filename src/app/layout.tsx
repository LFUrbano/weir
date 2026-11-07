import type { Metadata, Viewport } from "next";
import { Azeret_Mono, Funnel_Display, Funnel_Sans } from "next/font/google";
import { Footer } from "@/components/site/Footer";
import { CommandMenuProvider } from "@/components/site/CommandMenu";
import { Header } from "@/components/site/Header";
import { siteUrl } from "@/data/site";
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

export const metadata: Metadata = {
  title: {
    default: "Weir — Open models in production",
    template: "%s · Weir",
  },
  description:
    "Run open-weight models behind one API, billed by the token, and move to dedicated GPUs when your traffic outgrows shared capacity.",
  metadataBase: siteUrl,
  openGraph: {
    type: "website",
    siteName: "Weir",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Weir: open models in production" }],
  },
  twitter: { card: "summary_large_image", images: ["/og.png"] },
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
          className="sr-only z-50 rounded-md bg-amber px-3 py-2 text-small leading-normal font-medium text-amber-ink focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Skip to content
        </a>
        <CommandMenuProvider>
          <Header />
          <main id="main" className="flex flex-1 flex-col">
            {children}
          </main>
          <Footer />
        </CommandMenuProvider>
      </body>
    </html>
  );
}
