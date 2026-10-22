import type { Metadata } from "next";
import Estimator from "@/components/Estimator";
import { markets } from "@/lib/markets";

const title = "Price your home cleaning";
const description = "Bedrooms, bathrooms, and home size in pounds. Book on WhatsApp, by text, or by email.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description },
};

export default function Page() {
  return <Estimator market={markets.uk} />;
}
