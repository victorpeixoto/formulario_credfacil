import type { NextConfig } from "next";

const projectRoot = process.cwd();

const nextConfig: NextConfig = {
  output: 'standalone',
  allowedDevOrigins: ['*.ngrok-free.app', '*.ngrok.io'],
  serverExternalPackages: ['pdf-to-img', '@napi-rs/canvas'],
  turbopack: {
    root: projectRoot,
  },
  outputFileTracingRoot: projectRoot,
  outputFileTracingIncludes: {
    '/api/validacao/iniciar': [
      './node_modules/@napi-rs/canvas/**/*',
      './node_modules/@napi-rs/canvas-*/**/*',
    ],
  },
};

export default nextConfig;
