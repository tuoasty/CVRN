import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname:"tr.rbxcdn.com",
      }
    ]
  }
};

export default nextConfig;
