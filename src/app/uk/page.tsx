import type { Metadata } from "next";
import MarketEstimator from "@/components/MarketEstimator";
import { marketChoices, markets } from "@/lib/markets";

export const metadata: Metadata = {
  title: "Price your home cleaning",
  description: "An hourly price for a regular clean, or a fixed price for a deeper clean. Call, text, email, or WhatsApp.",
};

export default function Page() {
  return <MarketEstimator market={markets.uk} choices={marketChoices("uk")} />;
}
