import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emits a self-contained .next/standalone tree (server.js + minimal node_modules)
  // so the app runs under plain `node server.js` on the VPS, not just `next start` on
  // Vercel. Harmless on Vercel (it builds standalone anyway). Static assets
  // (.next/static, public/) are intentionally NOT bundled — the deploy step copies them.
  output: "standalone",
  images: {
    minimumCacheTTL: 2678400,
    qualities: [75],
    /**
     * Narrowed from Next's 8 defaults ([640,750,828,1080,1200,1920,2048,3840]).
     *
     * Every distinct width in this list is a separate billed transformation per source
     * image, and Hobby allows 5,000/month. These four cover phone / tablet / laptop /
     * desktop; the dropped entries were either near-duplicates of a neighbour (750≈828,
     * 1080≈1200) or 4K-only (2048, 3840).
     *
     * Trade-off: a viewport-scaled image on a 4K display now upscales from 1920 rather
     * than being served at native resolution. Only the hero and media grid are large
     * enough for that to be visible.
     */
    deviceSizes: [640, 828, 1200, 1920],
    /**
     * Left at the defaults deliberately. These serve fixed-size images, and the app renders
     * logos and avatars from 16px up to 240px — dropping 384 would push the 2x variant of a
     * 150px image up to the smallest deviceSize (640), costing more transfer than it saves.
     */
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "tr.rbxcdn.com",
      },
      {
        protocol: "https",
        hostname: "vugadarignzinrfhxbng.supabase.co",
      },
      {
        protocol: "https",
        hostname: "tklvaiurgmvqnsspocsm.supabase.co",
      },
      {
        protocol: "https",
        hostname: "img.youtube.com",
      },
      {
        protocol: "https",
        hostname: "*.tiktokcdn.com",
      },
    ]
  }
};

export default nextConfig;
