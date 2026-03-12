import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname:"tr.rbxcdn.com",
      },
      {
        protocol: "https",
        hostname: "vugadarignzinrfhxbng.supabase.co",
      },
    ]
  }
};

export default nextConfig;
