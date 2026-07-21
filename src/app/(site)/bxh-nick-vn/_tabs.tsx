"use client";

import { useEffect, useMemo, useState } from "react";
import { Crown, Search, Heart, Star, Trophy, Zap, Users } from "lucide-react";
import { cn } from "@/lib/utils";

/** Nick VN tự chấm điểm từ dữ liệu thật (bảng ff_auto_scores). */
export type AutoRow = {
  ff_id: string;
  nickname: string | null;
  level: number | null;
  likes: number | null;
  br_rank_point: number | null;
  score: number | null;
};

/** Nick do cộng đồng tự khai qua máy ước tính (bảng account_scores). */
export type CommunityRow = {
  ff_id: string | null;
  display_name: string | null;
  avatar_url: string | null;
  score: number;
  tier: string | null;
};

type Tab = "auto" | "community";

const MEDAL = ["text-amber-400", "text-zinc-400", "text-orange-600"];
const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

function RankBadge({ rank }: { rank: number }) {
  const i = rank - 1;
  return (
    <span className={cn("flex w-8 shrink-0 justify-center font-heading text-lg font-black", i < 3 ? MEDAL[i] : "text-muted-foreground")}>
      {i < 3 ? <Crown className="size-5" /> : <span className="text-sm">{rank}</span>}
    </span>
  );
}

export function BxhNickTabs({ auto, community }: { auto: AutoRow[]; community: CommunityRow[] }) {
  const [tab, setTab] = useState<Tab>("auto");
  const [query, setQuery] = useState("");

  // Cho phép link thẳng vào tab cộng đồng (#cong-dong) — vd sau khi đăng điểm tự khai.
  // Đặt sau khi mount để tránh lệch hydrate.
  useEffect(() => {
    if (window.location.hash === "#cong-dong") setTab("community");
  }, []);

  // Giữ số hạng thật theo vị trí gốc, chỉ lọc phần hiển thị.
  const rankedAuto = useMemo(() => auto.map((r, i) => ({ ...r, rank: i + 1 })), [auto]);
  const rankedCommunity = useMemo(() => community.map((r, i) => ({ ...r, rank: i + 1 })), [community]);

  const q = norm(query.trim());

  const filteredAuto = useMemo(() => {
    if (!q) return rankedAuto;
    return rankedAuto.filter((r) => norm(r.nickname || `FF ${r.ff_id}`).includes(q) || r.ff_id.includes(q));
  }, [rankedAuto, q]);

  const filteredCommunity = useMemo(() => {
    if (!q) return rankedCommunity;
    return rankedCommunity.filter((r) => {
      const name = r.display_name || (r.ff_id ? `FF ${r.ff_id}` : "Người chơi");
      return norm(name).includes(q) || (r.ff_id ?? "").includes(q);
    });
  }, [rankedCommunity, q]);

  const TABS = [
    { key: "auto" as const, label: "Tự động (VN)", icon: Zap, count: auto.length },
    { key: "community" as const, label: "Cộng đồng tự khai", icon: Users, count: community.length },
  ];

  const empty = tab === "auto" ? filteredAuto.length === 0 : filteredCommunity.length === 0;

  return (
    <div className="space-y-3">
      {/* Chuyển tab */}
      <div className="flex gap-1.5 rounded-xl border border-border bg-card p-1">
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              aria-pressed={active}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-colors",
                active ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <t.icon className="size-3.5" /> {t.label}
              <span className={cn("tabular-nums", active ? "opacity-80" : "opacity-50")}>({t.count})</span>
            </button>
          );
        })}
      </div>

      {/* Tìm kiếm */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm theo tên hoặc ID Free Fire…"
          className="h-11 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {empty ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center text-sm text-muted-foreground">
          {query
            ? `Không tìm thấy nick nào khớp “${query}”.`
            : tab === "auto"
            ? "Chưa có nick VN nào — hãy tra cứu một nick để tự động thêm vào BXH!"
            : "Chưa có ai đăng điểm tự khai. Dùng máy ước tính để đăng nhé!"}
        </div>
      ) : tab === "auto" ? (
        <div className="space-y-2">
          {filteredAuto.map((r) => (
            <div
              key={r.ff_id}
              className={cn(
                "flex items-center gap-3 rounded-xl border p-3",
                r.rank === 1 && "border-amber-400/40 bg-amber-400/5",
                r.rank === 2 && "border-slate-400/30 bg-slate-400/5",
                r.rank === 3 && "border-amber-700/30 bg-amber-700/5",
                r.rank > 3 && "border-border bg-card",
              )}
            >
              <RankBadge rank={r.rank} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-heading text-sm font-black text-foreground">{r.nickname || "Ẩn danh"}</p>
                <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Star className="size-3" /> Lv {r.level ?? "—"}</span>
                  <span className="inline-flex items-center gap-1"><Heart className="size-3" /> {(r.likes ?? 0).toLocaleString("vi-VN")}</span>
                  <span className="inline-flex items-center gap-1"><Trophy className="size-3" /> {(r.br_rank_point ?? 0).toLocaleString("vi-VN")}</span>
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-heading text-lg font-black tabular-nums text-primary dark:text-amber-400">
                  {(r.score ?? 0).toLocaleString("vi-VN")}
                </p>
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">điểm</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredCommunity.map((r) => {
            const name = r.display_name || (r.ff_id ? `FF ${r.ff_id}` : "Người chơi");
            return (
              <div key={r.rank} className={cn("flex items-center gap-3 rounded-2xl border bg-card p-3", r.rank <= 3 ? "border-primary/40" : "border-border")}>
                <RankBadge rank={r.rank} />
                <div className="size-9 shrink-0 overflow-hidden rounded-full border border-border bg-muted/40">
                  {r.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.avatar_url} alt={name} className="size-full object-cover" />
                  ) : (
                    <div className="flex size-full items-center justify-center text-sm font-black text-muted-foreground">{name.slice(0, 1).toUpperCase()}</div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-heading text-sm font-bold uppercase tracking-wide text-foreground">{name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {r.ff_id ? `ID: ${r.ff_id}` : ""}{r.ff_id && r.tier ? " · " : ""}{r.tier ?? ""}
                  </p>
                </div>
                <span className="shrink-0 font-heading text-lg font-black tabular-nums text-primary">{r.score.toLocaleString("vi-VN")}</span>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-center text-[11px] text-muted-foreground/70">
        {tab === "auto"
          ? "Điểm tự tính từ cấp độ, lượt thích, EXP & rank — chỉ để tham khảo cho vui. Chỉ gồm tài khoản khu vực VN."
          : "Điểm do người dùng tự khai qua máy ước tính (chỉ để vui) — không phản ánh giá trị giao dịch."}
      </p>
    </div>
  );
}
