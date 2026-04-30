import { ImageResponse } from "next/og";
import { getEventById } from "@/lib/data/content-service";
import { siteConfig } from "@/lib/constants/site";

export const runtime = "nodejs";
export const alt = "Arex — Sự kiện Free Fire";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const STATUS_LABEL: Record<string, string> = {
  active: "ĐANG DIỄN RA",
  upcoming: "SẮP DIỄN RA",
  expired: "ĐÃ KẾT THÚC",
};

export default async function OgImage({ params }: { params: { id: string } }) {
  const event = await getEventById(params.id);
  const title = event?.title ?? siteConfig.name;
  const status = event?.status ?? "upcoming";
  const cover = event?.image_url ?? "";
  const dateRange = event
    ? `${new Date(event.start_date).toLocaleDateString("vi-VN")}${
        event.end_date && event.end_date !== event.start_date
          ? ` → ${new Date(event.end_date).toLocaleDateString("vi-VN")}`
          : ""
      }`
    : "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: "#0b1220",
          color: "white",
        }}
      >
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
          <img
            src={cover}
            style={{
              position: "absolute", inset: 0, width: "100%", height: "100%",
              objectFit: "cover", opacity: 0.5, filter: "blur(2px)",
            }}
          />
        )}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(180deg, rgba(11,18,32,0.55) 0%, rgba(11,18,32,0.9) 100%)",
        }} />
        <div style={{
          position: "relative", display: "flex", flexDirection: "column",
          justifyContent: "space-between", padding: "60px 70px", width: "100%", height: "100%",
        }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 14,
            fontSize: 22, fontWeight: 700, letterSpacing: 4,
            textTransform: "uppercase", color: "#fbbf24",
          }}>
            <span style={{
              padding: "6px 14px", borderRadius: 8,
              background: status === "active" ? "#ff9800" : status === "upcoming" ? "#4CAF50" : "#64748b",
              color: "#0b1220",
            }}>
              {STATUS_LABEL[status] ?? "SỰ KIỆN"}
            </span>
            · AREX
          </div>
          <div style={{
            display: "flex", fontSize: title.length > 80 ? 54 : 70,
            fontWeight: 900, lineHeight: 1.05, letterSpacing: -1, maxWidth: 1060,
          }}>
            {title.length > 140 ? title.slice(0, 137) + "…" : title}
          </div>
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            fontSize: 22, opacity: 0.9,
          }}>
            <span style={{ letterSpacing: 2 }}>{dateRange}</span>
            <span style={{ color: "#fbbf24", fontWeight: 700 }}>
              {siteConfig.url.replace(/^https?:\/\//, "")}
            </span>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
