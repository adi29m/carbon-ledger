import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CarbonLedger — Your CBAM workspace",
  description: "Bring supplier evidence, data review, and CBAM report preparation into one clear workspace. An interactive demo for aluminium exporters.",
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
