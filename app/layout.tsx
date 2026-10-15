import type { Metadata, Viewport } from "next";
import "./globals.css";
import { fontVariables } from "./fonts";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getEdition } from "@/lib/news";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.name}: Verified Superintelligence & AI News`, template: `%s | ${SITE.name}` },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: ["superintelligence", "AGI", "artificial intelligence news", "AI safety", "frontier AI", "OpenAI", "Anthropic", "Google DeepMind", "AI jobs", "AI risk", "AI extinction risk"],
  alternates: { canonical: "/", types: { "application/rss+xml": [{ url: "/feed.xml", title: `${SITE.name} RSS` }] } },
  openGraph: { type: "website", siteName: SITE.name, title: SITE.name, description: SITE.description, url: "/", locale: "en_US" },
  twitter: { card: "summary_large_image", title: SITE.name, description: SITE.description },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
  icons: { icon: "/icon.svg" },
  other: { "google-adsense-account": SITE.adsenseClient },
};

export const viewport: Viewport = { themeColor: "#ffffff", colorScheme: "light" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const ed = await getEdition();
  return (
    <html lang="en" className={fontVariables}>
      <head>
        {/* Google AdSense: verifies the site and serves ads once enabled in the AdSense dashboard. */}
        <script async src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${SITE.adsenseClient}`} crossOrigin="anonymous" />
      </head>
      <body>
        <Header generatedAt={ed.generatedAt} today={ed.today} />
        <main className="wrap">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
