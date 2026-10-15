import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // STATIC_EXPORT=1 builds plain files for Cloudflare Pages (see lib/static.ts).
  ...(process.env.STATIC_EXPORT === "1" ? { output: "export" as const, images: { unoptimized: true } } : {}),
};

export default nextConfig;
