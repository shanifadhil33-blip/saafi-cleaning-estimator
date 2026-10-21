import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
const inter = Inter({ subsets: ["latin"], variable: "--f-body" });
const serif = Playfair_Display({ subsets: ["latin"], variable: "--f-display", weight: ["500", "600", "700"] });
export const metadata: Metadata = { title: "Saafi Cleaning Estimator", description: "Price your home cleaning in seconds and book on WhatsApp." };
export const viewport: Viewport = { themeColor: "#0A0A0A", width: "device-width", initialScale: 1 };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body className={`${inter.variable} ${serif.variable}`}>{children}</body></html>;
}
