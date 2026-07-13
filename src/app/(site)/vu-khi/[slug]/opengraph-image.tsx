import { ImageResponse } from "next/og";
import { getWeaponBySlug } from "@/lib/data/ff-data";
import { weaponTypeLabel } from "@/lib/constants/weapon-types";
import { siteConfig } from "@/lib/constants/site";

export const runtime = "nodejs";
export const maxDuration = 10;
export const alt = "Arex — Vũ khí Free Fire";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const weapon = await getWeaponBySlug(slug);
  const name = weapon?.name ?? siteConfig.name;
  const type = weaponTypeLabel(weapon?.weapon_type) ?? "Vũ khí Free Fire";
  const image = weapon?.image_url ?? "";

  const stats: Array<[string, string]> = weapon
    ? [
        ["SÁT THƯƠNG", String(weapon.damage ?? "—")],
        ["TẦM BẮN", String(weapon.range ?? "—")],
        ["TỐC ĐỘ BẮN", String(weapon.rate_of_fire ?? "—")],
      ]
    : [];

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
            background: "radial-gradient(circle at 78% 50%, rgba(251,191,36,0.16) 0%, transparent 55%)",
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
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: "100%", maxWidth: 620 }}>
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
              {type} · AREX
            </div>

            <div style={{ display: "flex", fontSize: name.length > 20 ? 72 : 92, fontWeight: 900, lineHeight: 1.02, letterSpacing: -1 }}>
              {name.length > 40 ? name.slice(0, 37) + "…" : name}
            </div>

            <div style={{ display: "flex", gap: 18 }}>
              {stats.map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                    padding: "14px 22px",
                    borderRadius: 16,
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.10)",
                  }}
                >
                  <span style={{ fontSize: 15, letterSpacing: 2, opacity: 0.7 }}>{label}</span>
                  <span style={{ fontSize: 34, fontWeight: 800, color: "#fbbf24" }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: weapon image */}
          {image && (
            // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
            <img
              src={image}
              width={420}
              height={420}
              style={{ objectFit: "contain", filter: "drop-shadow(0 12px 40px rgba(0,0,0,0.5))" }}
            />
          )}
        </div>
      </div>
    ),
    size,
  );
}
