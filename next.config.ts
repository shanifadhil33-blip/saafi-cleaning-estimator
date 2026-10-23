import type { NextConfig } from "next";

// Static export so the demo can be hosted on Cloudflare Pages / GitHub Pages (no server needed).
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  basePath,
  assetPrefix: basePath || undefined,
};

export default nextConfig;
