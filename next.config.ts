import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /** The whole app is client-side, so it ships as plain files: `npm run build` writes ./out for any static host. */
  output: "export",
};

export default nextConfig;
