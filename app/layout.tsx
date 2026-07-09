import type { Metadata } from "next";

import "@/app/globals.css";

export const metadata: Metadata = {
  title: "Arc Quant Agent Dashboard",
  description: "Arc Testnet simulation terminal for USDC-denominated quant-style workflows."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
