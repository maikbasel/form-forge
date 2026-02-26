import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@repo/ui", "@repo/i18n"],
  output: "standalone",
};

export default nextConfig;
