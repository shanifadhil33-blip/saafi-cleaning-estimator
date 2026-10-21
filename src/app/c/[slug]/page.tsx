import { notFound } from "next/navigation";
import Estimator from "@/components/Estimator";
import { companies } from "@/lib/companies";
export const dynamicParams = false;
export function generateStaticParams() { return Object.keys(companies).map((slug) => ({ slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const c = companies[(await params).slug]; return { title: c ? (c.brand.en ? `${c.brand.en} Cleaning Estimator` : "Home cleaning price estimator") : "Not found" };
}
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const c = companies[(await params).slug]; if (!c) notFound(); return <Estimator company={c} />;
}
