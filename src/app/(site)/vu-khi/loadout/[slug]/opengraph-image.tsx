import { ImageResponse } from "next/og";
import { getLoadoutBySlug } from "@/lib/data/ff-data";
import { playstyleLabel } from "@/lib/constants/weapon-types";
import { siteConfig } from "@/lib/constants/site";

export const runtime = "nodejs";
export const maxDuration = 10;
export const alt = "Arex — Combo vũ khí Free Fire";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const loadout = await getLoadoutBySlug(slug);
  const name = loadout?.name ?? siteConfig.name;
  const style = playstyleLabel(loadout?.playstyle) ?? "Combo Free Fire";
  const weapons = [loadout?.primary_weapon, loadout?.secondary_weapon].filter(Boolean) as NonNullable<
    NonNullable<typeof loadout>["primary_weapon"]
  >[];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          background: "#0b1220",
          color: "white",
          padding: "60px 70px",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "radial-gradient(circle at 50% 120%, rgba(251,191,36,0.16) 0%, transparent 55%)",
          }}
        />

        <div
          style={{
            position: "relative",
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
          Combo · {style} · AREX
        </div>

        <div
          style={{
            position: "relative",
            display: "flex",
            fontSize: name.length > 24 ? 64 : 84,
            fontWeight: 900,
            lineHeight: 1.02,
            letterSpacing: -1,
            marginTop: 24,
          }}
        >
          {name.length > 44 ? name.slice(0, 41) + "…" : name}
        </div>

        {/* Weapons row */}
        <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 40, marginTop: "auto" }}>
          {weapons.map((w, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 40 }}>
              {i > 0 && <span style={{ fontSize: 60, fontWeight: 900, color: "#fbbf24" }}>+</span>}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    display: "flex",
                    width: 220,
                    height: 220,
                    borderRadius: 28,
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.10)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
                  <img src={w.image_url} width={180} height={180} style={{ objectFit: "contain" }} />
                </div>
                <span style={{ fontSize: 28, fontWeight: 800, textTransform: "uppercase" }}>{w.name}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
