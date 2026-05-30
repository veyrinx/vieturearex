"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Trophy, Pencil, RotateCcw, Loader2, X, Crown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ConfirmDeleteDialog } from "@/components/admin/confirm-delete-dialog";
import { cn } from "@/lib/utils";

type Contributor = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  posts_count: number;
  replies_count: number;
  wiki_count: number;
  total_points: number;
  badge: string;
  updated_at: string;
};

const BADGE_CLS: Record<string, string> = {
  member:      "bg-muted text-muted-foreground border-border",
  contributor: "bg-blue-500/10 text-blue-500 border-blue-400/30",
  veteran:     "bg-amber-500/10 text-amber-500 border-amber-400/30",
  legend:      "bg-purple-500/10 text-purple-500 border-purple-400/30",
};

const BADGE_LABELS: Record<string, string> = {
  member: "Thành viên", contributor: "Đóng góp", veteran: "Kỳ cựu", legend: "Huyền thoại",
};

const RANK_ICON = (rank: number) => {
  if (rank === 1) return <Crown className="size-4 text-amber-400" />;
  if (rank === 2) return <Trophy className="size-4 text-slate-400" />;
  if (rank === 3) return <Trophy className="size-4 text-amber-700" />;
  return <span className="w-4 text-center text-xs text-muted-foreground font-mono">#{rank}</span>;
};

type EditState = {
  user_id: string;
  display_name: string | null;
  total_points: number;
  posts_count: number;
  replies_count: number;
  wiki_count: number;
  badge: string;
};

export function ContributorsPanel() {
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [loading, setLoading] = useState(true);
  const [editTarget, setEditTarget] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);

  const reload = () => {
    void fetch("/api/admin/contributors")
      .then((r) => r.json())
      .then((d) => setContributors(d.contributors ?? []))
      .finally(() => setLoading(false));
  };

  useEffect(reload, []);

  const saveEdit = async () => {
    if (!editTarget) return;
    setSaving(true);
    const res = await fetch("/api/admin/contributors", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editTarget),
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Đã cập nhật");
      setEditTarget(null);
      reload();
    } else {
      toast.error("Không thể cập nhật");
    }
  };

  const resetAll = async () => {
    const res = await fetch("/api/admin/contributors", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope: "all" }),
    });
    if (res.ok) { toast.success("Đã reset toàn bộ điểm"); reload(); }
    else toast.error("Không thể reset");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="mr-2 size-5 animate-spin" /> Đang tải...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-black uppercase tracking-tight text-foreground">Top Contributors</h1>
          <p className="text-sm text-muted-foreground">{contributors.length} người dùng — chỉnh sửa điểm, huy hiệu và reset bảng xếp hạng</p>
        </div>
        <ConfirmDeleteDialog
          itemName="toàn bộ điểm đóng góp"
          itemType="bảng xếp hạng"
          description="Tất cả điểm, số bài viết, wiki sẽ bị reset về 0. Hành động này không thể hoàn tác."
          onConfirm={resetAll}
          trigger={
            <Button size="sm" variant="outline" className="gap-1.5 rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10">
              <RotateCcw className="size-3.5" /> Reset tất cả
            </Button>
          }
        />
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Tổng điểm", value: contributors.reduce((s, c) => s + c.total_points, 0).toLocaleString("vi-VN") },
          { label: "Bài viết", value: contributors.reduce((s, c) => s + c.posts_count, 0).toLocaleString("vi-VN") },
          { label: "Wiki", value: contributors.reduce((s, c) => s + c.wiki_count, 0).toLocaleString("vi-VN") },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-4 text-center">
            <p className="text-xl font-black text-foreground">{s.value}</p>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Leaderboard table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground">#</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground">Người dùng</th>
                <th className="hidden px-4 py-2.5 text-right text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground sm:table-cell">Bài viết</th>
                <th className="hidden px-4 py-2.5 text-right text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground md:table-cell">Wiki</th>
                <th className="px-4 py-2.5 text-right text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground">Điểm</th>
                <th className="px-4 py-2.5 text-center text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground">Huy hiệu</th>
                <th className="px-4 py-2.5 text-right text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {contributors.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                    <Trophy className="mx-auto mb-2 size-8 opacity-30" />
                    Chưa có dữ liệu đóng góp
                  </td>
                </tr>
              ) : contributors.map((c, i) => (
                <tr key={c.user_id} className={cn("border-b border-border/60 hover:bg-muted/20 transition-colors", i < 3 && "bg-amber-500/[0.02]")}>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center w-6">{RANK_ICON(i + 1)}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {c.avatar_url ? (
                        <img src={c.avatar_url} alt="" className="size-8 rounded-full object-cover" />
                      ) : (
                        <div className="flex size-8 items-center justify-center rounded-full bg-primary/15 text-xs font-black text-primary">
                          {(c.display_name ?? "?")[0].toUpperCase()}
                        </div>
                      )}
                      <p className="font-semibold text-foreground">{c.display_name ?? "Ẩn danh"}</p>
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 text-right text-xs text-muted-foreground sm:table-cell">{c.posts_count}</td>
                  <td className="hidden px-4 py-3 text-right text-xs text-muted-foreground md:table-cell">{c.wiki_count}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-bold text-foreground">{c.total_points.toLocaleString("vi-VN")}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={cn("inline-flex rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase", BADGE_CLS[c.badge])}>
                      {BADGE_LABELS[c.badge] ?? c.badge}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setEditTarget({ user_id: c.user_id, display_name: c.display_name, total_points: c.total_points, posts_count: c.posts_count, replies_count: c.replies_count, wiki_count: c.wiki_count, badge: c.badge })}
                      className="size-8 text-muted-foreground hover:text-amber-500"
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit dialog */}
      <Dialog open={Boolean(editTarget)} onOpenChange={(o) => { if (!o) setEditTarget(null); }}>
        <DialogContent className="max-w-sm">
          {editTarget && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="font-heading text-sm font-bold uppercase tracking-wide">Chỉnh sửa điểm</p>
                <button onClick={() => setEditTarget(null)}><X className="size-4 text-muted-foreground" /></button>
              </div>
              <p className="text-sm text-muted-foreground">{editTarget.display_name ?? editTarget.user_id}</p>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tổng điểm</label>
                <Input type="number" min={0} value={editTarget.total_points} onChange={(e) => setEditTarget((p) => p ? { ...p, total_points: Number(e.target.value) } : p)} className="h-9 text-sm" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Bài viết</label>
                  <Input type="number" min={0} value={editTarget.posts_count} onChange={(e) => setEditTarget((p) => p ? { ...p, posts_count: Number(e.target.value) } : p)} className="mt-1 h-9 text-sm" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Reply</label>
                  <Input type="number" min={0} value={editTarget.replies_count} onChange={(e) => setEditTarget((p) => p ? { ...p, replies_count: Number(e.target.value) } : p)} className="mt-1 h-9 text-sm" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Wiki</label>
                  <Input type="number" min={0} value={editTarget.wiki_count} onChange={(e) => setEditTarget((p) => p ? { ...p, wiki_count: Number(e.target.value) } : p)} className="mt-1 h-9 text-sm" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Huy hiệu</label>
                <select value={editTarget.badge} onChange={(e) => setEditTarget((p) => p ? { ...p, badge: e.target.value } : p)} className="mt-1 h-9 w-full rounded-xl border border-border bg-background px-3 text-sm">
                  {Object.entries(BADGE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>

              <Button onClick={saveEdit} disabled={saving} className="w-full rounded-xl gap-2">
                {saving && <Loader2 className="size-4 animate-spin" />} Lưu thay đổi
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
