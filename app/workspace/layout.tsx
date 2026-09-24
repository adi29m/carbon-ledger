import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CarbonLedger — Demo workspace",
  description: "Explore the CarbonLedger supplier evidence workspace with fictional aluminium export data.",
};

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return children;
}
