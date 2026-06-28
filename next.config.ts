import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // sharp is a native addon — keep it out of the server bundle.
  serverExternalPackages: ["sharp"],
};

export default nextConfig;
