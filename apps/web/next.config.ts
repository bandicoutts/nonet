import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  // The workspace packages ship TypeScript source, not a build step.
  transpilePackages: ['@nonet/design', '@nonet/engine'],
  typedRoutes: true,
};

export default config;
