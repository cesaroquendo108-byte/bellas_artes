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
};

const withMDX = createMDX();

export default withMDX(nextConfig);
