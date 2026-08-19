import type { NextConfig } from "next";
import createMDX from "@next/mdx";

const nextConfig: NextConfig = {
  pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
  async redirects() {
    return [
      { source: "/suite/inspire/feed", destination: "/inspire", permanent: false },
      { source: "/brand-kit", destination: "/brand-kits", permanent: false },
      { source: "/suite/brand-kit", destination: "/brand-kits", permanent: false },
    ]
  },
  turbopack: {
    root: process.cwd(),
  },
  experimental: {
    // TypeScript 5.9 still exposes the JS compiler API. Keeping the checker in a
    // worker thread avoids environments where nested Node processes lose stdout.
    useTypeScriptCli: false,
    workerThreads: true,
  },
};

const withMDX = createMDX();

export default withMDX(nextConfig);
