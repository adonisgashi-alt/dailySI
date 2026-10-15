import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { LiveClock } from "@/components/LiveClock";

export const metadata: Metadata = {
  title: { default: "Daily Super Intelligence — SI News, Verified", template: "%s · Daily Super Intelligence" },
  description:
    "The newspaper of record for the superintelligence era. Only confirmed news on AGI, frontier AI and the race to superintelligence, plus a live AI Replacing Humans Risk meter.",
  openGraph: { title: "Daily Super Intelligence", description: "Verified news from the superintelligence frontier.", type: "website" },
};

export const viewport: Viewport = {
  themeColor: "#f7f5ef",
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=JetBrains+Mono:wght@400;600&family=Playfair+Display:ital,wght@0,700;1,400&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600&family=UnifrakturMaguntia&display=swap"
        />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
      </head>
      <body>
        <div className="topbar">
          <div className="wrap">
            <span className="pulse">Live wire · auto-updating</span>
            <LiveClock />
          </div>
        </div>
        <div className="wrap">{children}</div>
        <footer className="site">
          <div className="wrap">
            <span>© {new Date().getFullYear()} Daily Super Intelligence. Headlines link to and credit their original publishers.</span>
            <span>
              <Link href="/about">Standards &amp; methodology</Link> · <Link href="/api/news">JSON wire</Link>
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
