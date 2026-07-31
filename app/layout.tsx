import type { Metadata } from "next";
import { Hanken_Grotesk } from "next/font/google";
import "./globals.css";

const hankenGrotesk = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
  display: "swap",
});

const siteTitle = "Bloom — Any recipe, on your gear";
const siteDescription =
  "A shared library of coffee recipes that converts to your own grinder and dose. Brew along with a guided timer.";

export const metadata: Metadata = {
  // Required so the per-recipe opengraph-image resolves to an absolute URL.
  // Crawlers and link-preview bots reject relative image paths, which would
  // silently undo the whole point of /r/<id>.
  metadataBase: new URL("https://bloom.rohanmahnot.space"),
  title: siteTitle,
  description: siteDescription,
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    type: "website",
  },
  twitter: {
    card: "summary",
    title: siteTitle,
    description: siteDescription,
  },
  icons: {
    icon: [{ url: "/favicon.png", sizes: "447x447", type: "image/png" }],
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${hankenGrotesk.variable} antialiased`}
      >
        {children}
        {/* Cloudflare Web Analytics — visitor counts, top pages, referrers.
            Separate from the in-app brew funnel in app/analytics.ts. */}
        <script
          type="module"
          src="https://static.cloudflareinsights.com/beacon.min.js"
          data-cf-beacon='{"token": "b183649ca6ee4426b59047628d1141f2"}'
        />
      </body>
    </html>
  );
}
