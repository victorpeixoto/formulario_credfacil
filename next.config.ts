import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  allowedDevOrigins: ['*.ngrok-free.app', '*.ngrok.io'],
  serverExternalPackages: ['pdf-to-img'],
};

export default nextConfig;
