import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
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
        hostname: "img.youtube.com",
      },
    ]
  }
};

export default nextConfig;
