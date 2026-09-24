import type { Metadata } from "next";
import "./globals.css";
import "./refinement.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://carbon-ledger-self.vercel.app"),
  title: "CarbonLedger — Evidence, organised",
  description: "A clear evidence workspace for aluminium exporters preparing CBAM data. Explore supplier records, human review, and draft evidence packs.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
