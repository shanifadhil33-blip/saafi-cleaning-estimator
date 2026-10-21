import type { Metadata, Viewport } from "next";
import { Inter, Instrument_Serif, Noto_Naskh_Arabic, Noto_Nastaliq_Urdu } from "next/font/google";
import "./globals.css";
const inter = Inter({ subsets: ["latin"], variable: "--f-body" });
const naskh = Noto_Naskh_Arabic({ subsets: ["arabic"], variable: "--f-ar", weight: ["400", "500", "600", "700"], display: "swap" });
const nastaliq = Noto_Nastaliq_Urdu({ subsets: ["arabic"], variable: "--f-ur", weight: ["400", "600", "700"], display: "swap" });
const serif = Instrument_Serif({ subsets: ["latin"], variable: "--f-display", weight: "400" });
export const metadata: Metadata = { title: "Saafi Cleaning Estimator", description: "Price your home cleaning in seconds and book on WhatsApp." };
export const viewport: Viewport = { themeColor: "#0A0A0A", width: "device-width", initialScale: 1 };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body className={`${inter.variable} ${serif.variable} ${naskh.variable} ${nastaliq.variable}`}>{children}</body></html>;
}
