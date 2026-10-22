import type { Metadata } from "next";
import MarketEstimator from "@/components/MarketEstimator";
import { marketChoices, markets } from "@/lib/markets";

export const metadata: Metadata = {
  title: "Price your home cleaning",
  description: "Bedrooms and bathrooms, a live price, then call, text, or email.",
};

export default function Page() {
  return <MarketEstimator market={markets.us} choices={marketChoices("us")} />;
}
