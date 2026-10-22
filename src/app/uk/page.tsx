import type { Metadata } from "next";
import Estimator from "@/components/Estimator";
import { defaultCompany } from "@/lib/companies";
import { markets } from "@/lib/markets";

export const metadata: Metadata = {
  title: "Price your home cleaning",
  description: "An hourly price for a regular clean, or a fixed price for a deeper clean. Call, text, email, or WhatsApp.",
};

export default function Page() {
  return <Estimator company={defaultCompany} market={markets.uk} />;
}
