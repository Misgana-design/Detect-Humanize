import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // FIX: Enable the compiler to stop heavy re-renders in React 19!
  reactCompiler: true,

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
};

export default nextConfig;
