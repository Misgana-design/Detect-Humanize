import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // FIX: Enable the compiler to stop heavy re-renders in React 19!
  reactCompiler: true,

  // Next.js 16 modern caching model
  cacheComponents: true,

  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },

  // Security best practice
  poweredByHeader: false,
};

export default nextConfig;
