import type { NextConfig } from "next";

const nextConfig: NextConfig = {

  output: "standalone",
  async redirects() {
    return [
      { source: "/updates", destination: "/information/updates", permanent: true },
      { source: "/updates/:version", destination: "/information/updates/:version", permanent: true },
    ];
  },
  experimental: {
    serverActions: {

      bodySizeLimit: "3mb",
    },
  },
  images: {

    unoptimized: true,
    minimumCacheTTL: 2678400,
    qualities: [75],

    deviceSizes: [640, 828, 1200, 1920],

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
        hostname: "cdn.cvrn.net",
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
