import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "x402-bazaar — the marketplace layer for agents on Stellar",
  description: "A self-hostable x402 facilitator for Stellar with a native Bazaar discovery layer. Live on testnet and mainnet. Post-quantum, anonymous agent identity.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
