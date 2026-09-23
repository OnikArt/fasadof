import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Vinext applies this request limit before App Router route handlers too.
      // Keep it just above the upload API's 12 MiB per-file validation limit so
      // multipart framing and multi-file requests can reach the JSON API.
      bodySizeLimit: "30mb",
    },
  },
};

export default nextConfig;
