import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Text Humanica",
    short_name: "TextHumanica",
    description: "AI humanizer and detector for natural, authentic writing.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#4f46e5",
    icons: [
      {
        src: "/logo-icon.webp",
        sizes: "192x192",
        type: "image/webp",
      },
      {
        src: "/logo-icon.webp",
        sizes: "512x512",
        type: "image/webp",
      },
    ],
  };
}
