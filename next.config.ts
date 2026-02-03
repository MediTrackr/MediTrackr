import type { NextConfig } from "next";

const extraOrigins = process.env.NEXT_PUBLIC_DEV_ORIGINS
  ? process.env.NEXT_PUBLIC_DEV_ORIGINS.split(",").map((o) => o.trim())
  : [];

const nextConfig: NextConfig = {
  allowedDevOrigins: ["localhost", "127.0.0.1", ...extraOrigins],
};

export default nextConfig;
