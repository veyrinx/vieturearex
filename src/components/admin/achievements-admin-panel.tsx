"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, RefreshCw, Plus, Trash2, Trophy, Shield } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDeleteDialog } from "@/components/admin/confirm-delete-dialog";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { EmptyState } from "@/components/common/empty-state";
import {
  ACHIEVEMENT_DEFS, ACHIEVEMENTS_BY_ID, RARITY_META, ACHIEVEMENT_CATEGORIES,
} from "@/lib/constants/achievements";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

type AchievementRow = {
  id: string;
  user_id: string;
  achievement: string;
  earned_at: string;
  users: { display_name: string | null; email: string; avatar_url: string | null };
};

async function fetchAchievements(userId?: string): Promise<AchievementRow[]> {
  const url = userId ? `/api/admin/achievements?user_id=${userId}` : "/api/admin/achievements";
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed");
  const data = await res.json() as { items: AchievementRow[] };
  return data.items ?? [];
}

function timeAgo(dateStr: string) {
  const d = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
  if (d === 0) return "hôm nay";
  if (d === 1) return "hôm qua";
  return `${d} ngày trước`;
}

export function AchievementsAdminPanel() {
  const queryClient = useQueryClient();
  const [userIdFilter, setUserIdFilter] = useState("");
  const [search, setSearch] = useState("");
  const [grantUserId, setGrantUserId] = useState("");
  const [grantAchievement, setGrantAchievement] = useState("");
  const [granting, setGranting] = useState(false);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["admin-achievements", userIdFilter],
    queryFn: () => fetchAchievements(userIdFilter || undefined),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-achievements"] });

  const handleGrant = async () => {
    if (!grantUserId.trim() || !grantAchievement) {
      toast.error("Điền đủ User ID và thành tựu");
      return;
    }
    setGranting(true);
    try {
      const res = await fetch("/api/admin/achievements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: grantUserId.trim(), achievement: grantAchievement }),
      });
      const data = await res.json() as { ok?: boolean; awarded?: boolean; error?: string };
      if (!res.ok) { toast.error(data.error ?? "Lỗi"); return; }
      if (data.awarded) toast.success("Đã cấp thành tựu!");
      else toast.info("Người dùng đã có thành tựu này rồi");
      setGrantUserId("");
      setGrantAchievement("");
      await invalidate();
    } catch { toast.error("Lỗi kết nối"); }
    finally { setGranting(false); }
  };

  const handleRevoke = async (userId: string, achievement: string) => {
    await fetch("/api/admin/achievements", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, achievement }),
    });
    toast.success("Đã thu hồi thành tựu");
    await invalidate();
  };

  const filtered = items.filter((item) => {
    if (!search) return true;
    const def = ACHIEVEMENTS_BY_ID[item.achievement];
    const name = (item.users.display_name ?? item.users.email).toLowerCase();
    return (
      name.includes(search.toLowerCase()) ||
      item.achievement.includes(search.toLowerCase()) ||
      def?.name.toLowerCase().includes(search.toLowerCase())
    );
  });

  // Stats
  const byAchievement = ACHIEVEMENT_DEFS.map((def) => ({
    def,
    count: items.filter((i) => i.achievement === def.id).length,
  })).sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-6">
      {/* Grant form */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-amber-500/10">
            <Trophy className="size-4 text-amber-500" />
          </div>
          <h2 className="font-heading text-sm font-black uppercase tracking-wide">Cấp Thành Tựu Thủ Công</h2>
        </div>
        <div className="flex flex-wrap gap-3">
          <Input
            value={grantUserId}
            onChange={(e) => setGrantUserId(e.target.value)}
            placeholder="User ID (UUID)..."
            className="flex-1 min-w-48 font-mono text-xs"
          />
          <Select value={grantAchievement} onValueChange={setGrantAchievement}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Chọn thành tựu..." />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(ACHIEVEMENT_CATEGORIES).map(([cat, meta]) => (
                <div key={cat}>
                  <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    {meta.icon} {meta.label}
                  </div>
                  {ACHIEVEMENT_DEFS.filter((d) => d.category === cat).map((def) => (
                    <SelectItem key={def.id} value={def.id}>
                      <span className="flex items-center gap-2">
                        <span>{def.icon}</span>
                        <span className="text-xs">{def.name}</span>
                        <span className={cn("text-[9px] font-bold", RARITY_META[def.rarity].color)}>
                          {RARITY_META[def.rarity].label}
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </div>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => void handleGrant()} disabled={granting} className="gap-1.5">
            <Plus className="size-4" />
            {granting ? "Đang cấp..." : "Cấp"}
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {byAchievement.slice(0, 4).map(({ def, count }) => (
          <div key={def.id} className={cn("rounded-xl border p-3 space-y-1", RARITY_META[def.rarity].bg)}>
            <div className="flex items-center gap-1.5">
              <span className="text-base">{def.icon}</span>
              <span className={cn("text-[9px] font-bold uppercase", RARITY_META[def.rarity].color)}>
                {RARITY_META[def.rarity].label}
              </span>
            </div>
            <p className="text-xs font-bold text-foreground line-clamp-1">{def.name}</p>
            <p className="text-lg font-black text-foreground">{count}</p>
            <p className="text-[10px] text-muted-foreground">người đạt được</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên, email, thành tựu..."
            className="pl-8 h-9 text-xs"
          />
        </div>
        <Input
          value={userIdFilter}
          onChange={(e) => setUserIdFilter(e.target.value)}
          placeholder="Lọc theo User ID..."
          className="w-64 font-mono text-xs h-9"
        />
        <Button variant="outline" size="sm" onClick={invalidate} className="h-9 gap-1.5 text-xs">
          <RefreshCw className="size-3.5" /> Làm mới
        </Button>
      </div>

      {isLoading ? (
        <LoadingSpinner className="py-10" label="ĐANG TẢI..." />
      ) : filtered.length === 0 ? (
        <EmptyState title="KHÔNG CÓ KẾT QUẢ" description="Chưa có thành tựu nào hoặc không khớp bộ lọc." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground">Người dùng</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground">Thành tựu</th>
                <th className="hidden px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground md:table-cell">Độ hiếm</th>
                <th className="hidden px-4 py-2.5 text-right text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground sm:table-cell">Ngày đạt</th>
                <th className="px-4 py-2.5 text-right text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const def = ACHIEVEMENTS_BY_ID[item.achievement];
                const rarityMeta = def ? RARITY_META[def.rarity] : null;
                return (
                  <tr key={item.id} className="border-b border-border/60 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-xs font-semibold text-foreground">
                          {item.users.display_name ?? item.users.email.split("@")[0]}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-mono truncate max-w-[140px]">{item.user_id}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{def?.icon ?? "🏅"}</span>
                        <div>
                          <p className="text-xs font-semibold">{def?.name ?? item.achievement}</p>
                          <p className="text-[10px] text-muted-foreground">{item.achievement}</p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      {rarityMeta && (
                        <span className={cn("text-[10px] font-bold uppercase", rarityMeta.color)}>
                          {rarityMeta.label}
                        </span>
                      )}
                    </td>
                    <td className="hidden px-4 py-3 text-right text-xs text-muted-foreground sm:table-cell">
                      <span title={format(new Date(item.earned_at), "dd/MM/yyyy HH:mm", { locale: vi })}>
                        {timeAgo(item.earned_at)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <ConfirmDeleteDialog
                          itemName={`thành tựu "${def?.name ?? item.achievement}"`}
                          itemType="thành tựu"
                          description="Thành tựu sẽ bị thu hồi. Có thể cấp lại sau."
                          onConfirm={() => handleRevoke(item.user_id, item.achievement)}
                          trigger={
                            <Button size="sm" variant="ghost" className="size-7 rounded-lg p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                              <Trash2 className="size-3.5" />
                            </Button>
                          }
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="border-t border-border px-4 py-2">
            <p className="text-xs text-muted-foreground">{filtered.length} thành tựu</p>
          </div>
        </div>
      )}

      {/* Achievement catalog */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="size-4 text-muted-foreground" />
          <h2 className="font-heading text-xs font-black uppercase tracking-wide text-muted-foreground">
            Danh Mục Thành Tựu ({ACHIEVEMENT_DEFS.length} loại)
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {ACHIEVEMENT_DEFS.map((def) => {
            const count = items.filter((i) => i.achievement === def.id).length;
            const rarityMeta = RARITY_META[def.rarity];
            return (
              <div key={def.id} className={cn("rounded-xl border p-2.5 space-y-1", rarityMeta.bg, "opacity-90")}>
                <div className="flex items-center justify-between">
                  <span className="text-lg leading-none">{def.icon}</span>
                  <span className={cn("text-[9px] font-bold", rarityMeta.color)}>{count} người</span>
                </div>
                <p className="text-[10px] font-bold text-foreground leading-tight">{def.name}</p>
                <p className={cn("text-[9px] font-semibold uppercase", rarityMeta.color)}>{rarityMeta.label}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
