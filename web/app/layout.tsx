import type { Metadata } from "next";
import { Bricolage_Grotesque, Space_Grotesk, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Display + body are preloaded (above-the-fold hero + UI). Serif + mono are
// lazy: the serif is a single accent word, the mono is data/labels below the
// fold. All self-hosted by next/font — zero CSP/CDN failure mode.
const display = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--nf-display",
  display: "swap",
});
const body = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--nf-body",
  display: "swap",
});
const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: "italic",
  variable: "--nf-serif",
  display: "swap",
  preload: false,
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--nf-mono",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: "x402-bazaar — the discovery layer for the agent economy on Stellar",
  description:
    "A self-hostable x402 facilitator for Stellar with a native Bazaar discovery layer. Live on testnet and mainnet. Post-quantum, anonymous agent identity.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${serif.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
