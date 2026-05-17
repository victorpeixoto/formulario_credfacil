import type { NextConfig } from "next";

const projectRoot = process.cwd();

const nextConfig: NextConfig = {
  output: 'standalone',
  allowedDevOrigins: ['*.ngrok-free.app', '*.ngrok.io'],
  serverExternalPackages: ['pdf-to-img'],
  turbopack: {
    root: projectRoot,
  },
  outputFileTracingRoot: projectRoot,
};

export default nextConfig;
