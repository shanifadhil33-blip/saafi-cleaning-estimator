import type { Metadata } from "next";
import MarketEstimator from "@/components/MarketEstimator";
import { marketChoices, markets } from "@/lib/markets";

export const metadata: Metadata = {
  title: "Price your home cleaning",
  description: "Bedrooms and bathrooms in Canadian dollars, with French for Quebec.",
};

export default function Page() {
  return <MarketEstimator market={markets.ca} choices={marketChoices("ca")} />;
}
