import type { Metadata, Viewport } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Price your home cleaning", description: "Set your home details, see the price update as you go, and book on WhatsApp." };
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#0d0d0d" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Instrument+Serif&family=Noto+Naskh+Arabic:wght@400;500;600&family=Noto+Nastaliq+Urdu:wght@400;600&family=Noto+Sans+Devanagari:wght@400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
