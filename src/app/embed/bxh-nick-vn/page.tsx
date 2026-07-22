import type { Metadata } from "next";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import { siteConfig } from "@/lib/constants/site";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "BXH nick khủng VN — Widget | Arex",
  robots: { index: false, follow: false },
};

type Row = { ff_id: string; nickname: string | null; level: number | null; score: number | null };

async function getTop(limit: number): Promise<Row[]> {
  const db = createAdminSupabaseClient();
  if (!db) return [];
  try {
    const { data } = (await untypedFrom(db, "ff_auto_scores")
      .select("ff_id, nickname, level, score")
      .eq("region", "VN")
      .order("score", { ascending: false })
      .limit(limit)) as { data: Row[] | null };
    return data ?? [];
  } catch {
    return [];
  }
}

const MEDAL = ["🥇", "🥈", "🥉"];

export default async function BxhEmbedPage({
  searchParams,
}: {
  searchParams: Promise<{ limit?: string }>;
}) {
  const { limit: limitRaw } = await searchParams;
  const limit = Math.min(25, Math.max(3, Number(limitRaw) || 10));
  const rows = await getTop(limit);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0b1220 0%, #10182b 100%)",
        color: "#e2e8f0",
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        padding: 14,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 20 }}>🏆</span>
          <span style={{ fontWeight: 800, fontSize: 15, letterSpacing: 0.3 }}>BXH nick khủng VN</span>
        </div>
        <span style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: 1 }}>Free Fire</span>
      </div>

      {rows.length === 0 ? (
        <div style={{ padding: "28px 12px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
          Chưa có dữ liệu xếp hạng.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {rows.map((r, i) => (
            <div
              key={r.ff_id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 10px",
                borderRadius: 10,
                background: i < 3 ? "rgba(245,158,11,0.10)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${i < 3 ? "rgba(245,158,11,0.25)" : "rgba(255,255,255,0.06)"}`,
              }}
            >
              <span style={{ width: 24, textAlign: "center", fontSize: i < 3 ? 16 : 13, fontWeight: 800, color: "#94a3b8" }}>
                {MEDAL[i] ?? i + 1}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {r.nickname || `FF ${r.ff_id}`}
                </div>
                <div style={{ fontSize: 10, color: "#64748b" }}>Level {r.level ?? "—"}</div>
              </div>
              <span style={{ fontWeight: 800, fontSize: 13, color: "#f59e0b", fontVariantNumeric: "tabular-nums" }}>
                {(r.score ?? 0).toLocaleString("vi-VN")}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Footer link */}
      <a
        href={`${siteConfig.url}/bxh-nick-vn`}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "block",
          marginTop: 12,
          textAlign: "center",
          fontSize: 11,
          color: "#f59e0b",
          textDecoration: "none",
          fontWeight: 600,
        }}
      >
        Xem BXH đầy đủ trên {siteConfig.url.replace(/^https?:\/\//, "")} →
      </a>
    </div>
  );
}
