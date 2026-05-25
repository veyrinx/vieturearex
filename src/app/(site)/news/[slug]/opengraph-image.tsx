import { ImageResponse } from "next/og";
import { getNewsBySlug } from "@/lib/data/content-service";
import { siteConfig } from "@/lib/constants/site";

export const runtime = "nodejs";
export const maxDuration = 10;
export const alt = "Arex — Tin Tức Free Fire";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getNewsBySlug(slug);
  const title = article?.title ?? siteConfig.name;
  const category = article?.category ?? "TIN TỨC";
  const cover = article?.cover ?? "";

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
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: 0.45,
              filter: "blur(2px)",
            }}
          />
        )}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(11,18,32,0.55) 0%, rgba(11,18,32,0.85) 100%)",
          }}
        />
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "60px 70px",
            width: "100%",
            height: "100%",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: 4,
              textTransform: "uppercase",
              color: "#fbbf24",
            }}
          >
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: 999,
                background: "#fbbf24",
                boxShadow: "0 0 16px #fbbf24",
              }}
            />
            {category} · AREX
          </div>
          <div
            style={{
              display: "flex",
              fontSize: title.length > 80 ? 56 : 72,
              fontWeight: 900,
              lineHeight: 1.05,
              letterSpacing: -1,
              maxWidth: 1060,
            }}
          >
            {title.length > 140 ? title.slice(0, 137) + "…" : title}
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: 22,
              opacity: 0.9,
            }}
          >
            <span style={{ letterSpacing: 2, textTransform: "uppercase" }}>
              {siteConfig.url.replace(/^https?:\/\//, "")}
            </span>
            <span style={{ color: "#fbbf24", fontWeight: 700 }}>
              Free Fire Community
            </span>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
