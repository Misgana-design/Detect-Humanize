import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 56,
          background:
            "radial-gradient(circle at top left, #c7d2fe 0%, #eef2ff 28%, #0f172a 100%)",
          color: "#0f172a",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            color: "#312e81",
            fontSize: 28,
            fontWeight: 700,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#4f46e5",
              color: "white",
            }}
          >
            TH
          </div>
          Text Humanica
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 72, fontWeight: 800, color: "white" }}>
            Humanize AI. Rewrite Naturally.
          </div>
          <div style={{ fontSize: 28, color: "#cbd5e1", maxWidth: 900 }}>
            A polished workspace for students, researchers, and writers who need
            AI-assisted drafts to sound natural, clear, and publication-ready.
          </div>
        </div>
      </div>
    ),
    size,
  );
}
