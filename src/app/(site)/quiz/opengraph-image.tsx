import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/constants/site";

export const runtime = "nodejs";
export const alt = "Quiz Free Fire — Arex";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "70px 80px",
          background: "linear-gradient(135deg, #0b1220 0%, #1a1305 100%)",
          color: "white",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "radial-gradient(circle at 82% 30%, rgba(249,115,22,0.22) 0%, transparent 55%)",
          }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 26, fontWeight: 700, letterSpacing: 6, textTransform: "uppercase", color: "#f59e0b" }}>
          <div style={{ display: "flex", width: 44, height: 44, borderRadius: 12, background: "#f59e0b", alignItems: "center", justifyContent: "center", fontSize: 28 }}>🧠</div>
          {siteConfig.name} · Đố vui
        </div>
        <div style={{ display: "flex", fontSize: 96, fontWeight: 900, marginTop: 24, lineHeight: 1.05 }}>
          Quiz Free Fire
        </div>
        <div style={{ display: "flex", fontSize: 34, marginTop: 20, color: "#cbd5e1", maxWidth: 900 }}>
          Trắc nghiệm kiến thức: nhân vật, vũ khí, chế độ chơi & meta. Bạn hiểu game đến đâu?
        </div>
        <div style={{ display: "flex", marginTop: 40, fontSize: 24, color: "#94a3b8" }}>
          {siteConfig.url.replace(/^https?:\/\//, "")}/quiz
        </div>
      </div>
    ),
    { ...size },
  );
}
