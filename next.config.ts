import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse (via pdfjs-dist) loads a worker file at runtime that the
  // bundler doesn't copy into the build output. Leaving both packages
  // external lets them resolve their own files from node_modules.
  serverExternalPackages: ['pdf-parse', 'pdfjs-dist'],
  experimental: {
    serverActions: {
      bodySizeLimit: '150mb',
    },
    proxyClientMaxBodySize: '150mb',
  },
};

export default nextConfig;
