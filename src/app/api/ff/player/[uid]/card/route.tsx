import { ImageResponse } from "next/og";
import { isFfApiConfigured, normalizePlayerUid, getPlayerAllData } from "@/lib/server/ff-api";
import { siteConfig } from "@/lib/constants/site";

// Ảnh chia sẻ kết quả tra cứu nick (1200×630 PNG) — dùng cho Web Share / OG.
export const runtime = "nodejs";

const size = { width: 1200, height: 630 };

function num(v: unknown): string {
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString("vi-VN") : "—";
}

function errorImage(message: string) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 20,
          background: "linear-gradient(135deg, #0b1220 0%, #1a1305 100%)", color: "#e2e8f0",
        }}
      >
        <div style={{ display: "flex", fontSize: 72 }}>🔍</div>
        <div style={{ display: "flex", fontSize: 40, fontWeight: 800 }}>{message}</div>
        <div style={{ display: "flex", fontSize: 26, color: "#f59e0b" }}>
          {siteConfig.url.replace(/^https?:\/\//, "")}/tra-cuu-nick
        </div>
      </div>
    ),
    { ...size },
  );
}

export async function GET(_req: Request, ctx: { params: Promise<{ uid: string }> }) {
  const { uid: raw } = await ctx.params;
  const uid = normalizePlayerUid(raw);
  if (!uid) return errorImage("UID không hợp lệ");
  if (!isFfApiConfigured()) return errorImage("Chưa cấu hình Free Fire API");

  let a: Record<string, unknown> | undefined;
  let g: Record<string, unknown> | undefined;
  let sig = "";
  try {
    const data = await getPlayerAllData(uid);
    const result = data?.result as Record<string, unknown> | undefined;
    a = result?.AccountInfo as Record<string, unknown> | undefined;
    g = result?.GuildInfo as Record<string, unknown> | undefined;
    const social = result?.socialinfo as Record<string, unknown> | undefined;
    sig = typeof social?.AccountSignature === "string" ? social.AccountSignature : "";
  } catch {
    return errorImage("Không lấy được dữ liệu nick");
  }
  if (!a) return errorImage("Không tìm thấy tài khoản");

  const name = (a.AccountName as string) || "Ẩn danh";
  const region = (a.AccountRegion as string) || "?";
  const level = num(a.AccountLevel);

  const stats: Array<{ label: string; value: string; color: string }> = [
    { label: "Lượt thích", value: num(a.AccountLikes), color: "#fb7185" },
    { label: "Rank BR", value: num(a.BrRankPoint), color: "#f59e0b" },
    { label: "Rank CS", value: num(a.CsRankPoint), color: "#38bdf8" },
    { label: "EXP", value: num(a.AccountEXP), color: "#818cf8" },
  ];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%", display: "flex", flexDirection: "column",
          padding: "56px 64px", color: "white", position: "relative",
          background: "linear-gradient(135deg, #0b1220 0%, #10182b 45%, #1a1305 100%)",
        }}
      >
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 85% 15%, rgba(249,115,22,0.25) 0%, transparent 55%)" }} />

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 24, fontWeight: 700, letterSpacing: 5, textTransform: "uppercase", color: "#f59e0b" }}>
          <div style={{ display: "flex", width: 42, height: 42, borderRadius: 12, background: "#f59e0b", alignItems: "center", justifyContent: "center", fontSize: 24 }}>🔥</div>
          {siteConfig.name} · Tra cứu nick
        </div>

        {/* Name + level badge */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 40, gap: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", maxWidth: 780 }}>
            <div style={{ display: "flex", fontSize: 76, fontWeight: 900, lineHeight: 1.05 }}>{name}</div>
            <div style={{ display: "flex", fontSize: 28, marginTop: 12, color: "#94a3b8" }}>
              UID {uid} · Khu vực {region}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: 150, height: 150, borderRadius: 32, background: "linear-gradient(135deg, #f59e0b, #ea580c)" }}>
            <div style={{ display: "flex", fontSize: 22, fontWeight: 700, opacity: 0.85 }}>LEVEL</div>
            <div style={{ display: "flex", fontSize: 60, fontWeight: 900 }}>{level}</div>
          </div>
        </div>

        {/* Signature */}
        {sig ? (
          <div style={{ display: "flex", marginTop: 28, fontSize: 26, fontStyle: "italic", color: "#cbd5e1", maxWidth: 1000 }}>
            “{sig.slice(0, 90)}”
          </div>
        ) : null}

        {/* Stats */}
        <div style={{ display: "flex", gap: 20, marginTop: "auto" }}>
          {stats.map((s) => (
            <div key={s.label} style={{ display: "flex", flexDirection: "column", flex: 1, padding: "20px 24px", borderRadius: 20, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ display: "flex", fontSize: 20, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, color: "#94a3b8" }}>{s.label}</div>
              <div style={{ display: "flex", fontSize: 44, fontWeight: 900, marginTop: 6, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Footer: guild + url */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 26, fontSize: 24, color: "#94a3b8" }}>
          <div style={{ display: "flex" }}>
            {g?.GuildName ? `🛡️ ${String(g.GuildName)} · Lv ${num(g.GuildLevel)}` : "Chưa có guild"}
          </div>
          <div style={{ display: "flex", color: "#f59e0b" }}>
            {siteConfig.url.replace(/^https?:\/\//, "")}/tra-cuu-nick
          </div>
        </div>
      </div>
    ),
    { ...size, headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
  );
}
