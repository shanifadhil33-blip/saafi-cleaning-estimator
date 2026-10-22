import type { Metadata } from "next";
import Estimator from "@/components/Estimator";
import { markets } from "@/lib/markets";

const title = "Price your home cleaning";
const description = "Bedrooms, bathrooms, and home size, with a live price. Text or email to book.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description },
};

export default function Page() {
  return <Estimator market={markets.us} />;
}
