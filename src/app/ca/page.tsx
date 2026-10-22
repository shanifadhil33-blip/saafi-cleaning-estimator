import type { Metadata } from "next";
import Estimator from "@/components/Estimator";
import { defaultCompany } from "@/lib/companies";
import { markets } from "@/lib/markets";

export const metadata: Metadata = {
  title: "Price your home cleaning",
  description: "Bedrooms and bathrooms in Canadian dollars, with French for Quebec.",
};

export default function Page() {
  return <Estimator company={defaultCompany} market={markets.ca} />;
}
