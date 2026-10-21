import type { Metadata, Viewport } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import "./globals.css";
const inter = Inter({ subsets: ["latin"], variable: "--f-body" });
const serif = Instrument_Serif({ subsets: ["latin"], variable: "--f-display", weight: "400" });
export const metadata: Metadata = { title: "Saafi Cleaning Estimator", description: "Price your home cleaning in seconds and book on WhatsApp." };
export const viewport: Viewport = { themeColor: "#0A0A0A", width: "device-width", initialScale: 1 };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body className={`${inter.variable} ${serif.variable}`}>{children}</body></html>;
}
