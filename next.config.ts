import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // FIX: Enable the compiler to stop heavy re-renders in React 19!
  reactCompiler: true,

  // www → apex redirect (eliminates the 3XX Ahrefs warning for www variant)
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.texthumanica.com" }],
        destination: "https://texthumanica.com/:path*",
        permanent: true,
      },
    ];
  },

  // HSTS header — browser never makes plain HTTP request after first visit
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },

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
