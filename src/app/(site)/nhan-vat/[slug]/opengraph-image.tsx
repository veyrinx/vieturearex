import { ImageResponse } from "next/og";
import { getCharacterBySlug, splitSkill, ROLE_META, TIER_META } from "@/lib/data/ff-characters";
import { siteConfig } from "@/lib/constants/site";

export const runtime = "nodejs";
export const maxDuration = 10;
export const alt = "Arex — Nhân vật Free Fire";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const char = getCharacterBySlug(slug);
  const name = char?.name ?? siteConfig.name;
  const roleLabel = char ? ROLE_META[char.role].label : "Nhân vật Free Fire";
  const tierLabel = char ? `Tier ${char.tier} · ${TIER_META[char.tier].label}` : "";
  const skill = char ? splitSkill(char.skill) : { name: "", desc: "" };
  const image = char?.image ?? "";

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
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "radial-gradient(circle at 80% 45%, rgba(251,191,36,0.16) 0%, transparent 55%)",
          }}
        />
        <div
          style={{
            position: "relative",
            display: "flex",
            width: "100%",
            height: "100%",
            padding: "60px 70px",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          {/* Left: text */}
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: "100%", maxWidth: 640 }}>
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
              <div style={{ width: 14, height: 14, borderRadius: 999, background: "#fbbf24", boxShadow: "0 0 16px #fbbf24" }} />
              {roleLabel} · AREX
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", fontSize: name.length > 16 ? 76 : 96, fontWeight: 900, lineHeight: 1.02, letterSpacing: -1 }}>
                {name}
              </div>
              {tierLabel && (
                <div style={{ display: "flex", fontSize: 26, fontWeight: 700, color: "#fbbf24" }}>{tierLabel}</div>
              )}
            </div>

            {skill.name && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  padding: "18px 24px",
                  borderRadius: 18,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  maxWidth: 640,
                }}
              >
                <span style={{ fontSize: 24, fontWeight: 800 }}>{skill.name}</span>
                <span style={{ fontSize: 18, opacity: 0.8, lineHeight: 1.3 }}>
                  {skill.desc.length > 100 ? skill.desc.slice(0, 97) + "…" : skill.desc}
                </span>
              </div>
            )}
          </div>

          {/* Right: portrait */}
          <div
            style={{
              display: "flex",
              width: 340,
              height: 340,
              borderRadius: 40,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.10)",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
              <img src={image} width={340} height={340} style={{ objectFit: "cover" }} />
            ) : (
              <span style={{ fontSize: 180, fontWeight: 900, color: "rgba(255,255,255,0.25)" }}>
                {name.slice(0, 1)}
              </span>
            )}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
