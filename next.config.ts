import type { NextConfig } from "next";

/**
 * Vercel (`npm run build`) leaves this unset and stays a normal Next server build.
 * `npm run build:static` sets STATIC_EXPORT=1 and writes a fully static `out/` folder.
 */
const staticExport = process.env.STATIC_EXPORT === "1";

const nextConfig: NextConfig = {
  /* The round N mark is the Next.js dev indicator. Off here, and it is not in production builds. */
  devIndicators: false,
  ...(staticExport
    ? {
        output: "export" as const,
        /* No image optimizer on Cloudflare. There is no next/image usage today; this keeps a later one from calling `/_next/image`. */
        images: { unoptimized: true },
        /*
         * Default (false): `/c/saafi` is emitted as `out/c/saafi.html`.
         * wrangler.jsonc pairs that with Cloudflare `html_handling: "auto-trailing-slash"`,
         * which serves `/c/saafi` and redirects `/c/saafi/` to it.
         */
        trailingSlash: false,
      }
    : {}),
};

export default nextConfig;
