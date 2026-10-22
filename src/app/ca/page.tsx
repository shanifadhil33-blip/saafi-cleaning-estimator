import type { Metadata } from "next";
import Estimator from "@/components/Estimator";
import { markets } from "@/lib/markets";

const title = "Price your home cleaning";
const description = "Bedrooms, bathrooms, and home size in Canadian dollars. English and French.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description },
};

export default function Page() {
  return <Estimator market={markets.ca} />;
}
