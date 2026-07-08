import { BASE } from './site.config.js';
import path from 'node:path';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: BASE,              // served under footprintjs.github.io/hcifootprint
  trailingSlash: true,
  // The library repo above has its own lockfile; pin the trace root to this site so build
  // tracing (and the workspace-root inference) is deterministic in CI.
  outputFileTracingRoot: path.resolve('.'),
  images: { unoptimized: true },
  reactStrictMode: true,
  transpilePackages: ['storydeck'],
  webpack: (config, { isServer }) => {
    // storydeck ships source (jsx) and its own React peer; dedupe React in the client bundle only.
    config.resolve.symlinks = false;
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        react: path.resolve('./node_modules/react'),
        'react-dom': path.resolve('./node_modules/react-dom'),
      };
    }
    return config;
  },
};
export default nextConfig;
