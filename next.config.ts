import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // FIX: Enable the compiler to stop heavy re-renders in React 19!
  reactCompiler: true,

  // NOTE: cacheComponents removed — it conflicts with `export const runtime`
  // declarations in API routes (parse-file, humanize, etc.)

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

  // Allow ngrok dev tunnel (silences the cross-origin warning in dev)
  allowedDevOrigins: ["*.ngrok-free.app", "*.ngrok.io"],

  // Silence the workspace root warning — our project is in /detect-ai
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
