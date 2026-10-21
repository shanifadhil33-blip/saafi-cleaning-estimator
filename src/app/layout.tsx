import type { Metadata, Viewport } from "next";
import { Inter, Fraunces } from "next/font/google";
import "./globals.css";
const inter = Inter({ subsets: ["latin"], variable: "--f-body" });
const serif = Fraunces({ subsets: ["latin"], variable: "--f-display" });
export const metadata: Metadata = { title: "Saafi Cleaning Estimator", description: "Price your home cleaning in seconds and book on WhatsApp." };
export const viewport: Viewport = { themeColor: "#0E0F11", width: "device-width", initialScale: 1 };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body className={`${inter.variable} ${serif.variable}`}>{children}</body></html>;
}
