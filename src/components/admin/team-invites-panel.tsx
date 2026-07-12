"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner"; 
import { Copy, Plus, Trash2, Check, X, Loader2, Eye, RefreshCw, Phone, Gamepad2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ApplicantDetailDialog, type ApplicantDetail } from "@/components/admin/applicant-detail-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Invite = {
  id: string;
  token: string;
  label: string | null;
  used_at: string | null;
  expires_at: string;
  created_at: string;
  max_uses?: number | null;
  uses_count?: number | null;
};

type Pending = {
  id: string;
  email: string;
  display_name: string | null;
  role: string;
  team_status: string | null;
  applied_role?: string | null;
  application_note?: string | null;
  phone?: string | null;
  game_profiles?: Array<{ game: string; uid: string; nickname?: string; custom_label?: string }> | null;
  facebook_url?: string | null;
  instagram_url?: string | null;
  tiktok_url?: string | null;
  discord_url?: string | null;
  zalo_url?: string | null;
  created_at: string;
  avatar_url: string | null;
};

export function TeamInvitesPanel({ canCreate, isAdmin }: { canCreate: boolean; isAdmin: boolean }) {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [pendingIt, setPendingIt] = useState<Pending[]>([]);
  const [pendingAdmin, setPendingAdmin] = useState<Pending[]>([]);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState("");
  const [days, setDays] = useState(7);
  const [maxUses, setMaxUses] = useState(1);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [detail, setDetail] = useState<ApplicantDetail | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const [iRes, pRes] = await Promise.all([
        fetch("/api/admin/team/invites"),
        fetch("/api/admin/team/approval"),
      ]);
      if (iRes.ok) {
        const d = (await iRes.json()) as { invites: Invite[] };
        setInvites(d.invites ?? []);
      }
      if (pRes.ok) {
        const d = (await pRes.json()) as { pending_it?: Pending[]; pending_admin?: Pending[] };
        setPendingIt(d.pending_it ?? []);
        setPendingAdmin(d.pending_admin ?? []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void refresh(); }, []);

  const onCreate = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/admin/team/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: label.trim() || undefined,
          expiresInDays: days,
          maxUses,
        }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        toast.error(data.error ?? "Không tạo được mã mời.");
        return;
      }
      await navigator.clipboard.writeText(data.url).catch(() => null);
      toast.success("Đã tạo và copy link mời.");
      setLabel("");
      void refresh();
    } finally {
      setCreating(false);
    }
  };

  const copyUrl = async (token: string) => {
    const url = `${window.location.origin}/team-join/${token}`;
    await navigator.clipboard.writeText(url).catch(() => null);
    toast.success("Đã copy link.");
  };

  const onRevoke = async (id: string) => {
    if (!confirm("Thu hồi link mời này?")) return;
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/team/invites?id=${id}`, { method: "DELETE" });
      if (res.ok) { toast.success("Đã thu hồi."); void refresh(); }
    } finally { setBusy(null); }
  };

  const onApproval = async (
    userId: string,
    action: "approve_it" | "approve_admin" | "reject",
  ) => {
    setBusy(userId);
    try {
      const res = await fetch("/api/admin/team/approval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) { toast.error(data.error ?? "Không thực hiện được."); return; }
      toast.success(
        action === "approve_it" ? "IT đã duyệt — chuyển sang admin duyệt."
          : action === "approve_admin" ? "Đã duyệt cuối, gửi email đặt mật khẩu."
          : "Đã từ chối.",
      );
      void refresh();
    } finally { setBusy(null); }
  };

  return (
    <div className="space-y-6">
      {/* Vòng 1: IT duyệt */}
      <PendingSection
        title="Vòng 1 — IT duyệt"
        subtitle={
          "Các vai trò có quyền duyệt: IT, Admin, Super Admin. Sau khi duyệt, đơn sẽ được chuyển sang Vòng 2."
        }
        list={pendingIt}
        loading={loading}
        busy={busy}
        approveLabel="IT duyệt"
        approveAction="approve_it"
        canApprove={true}
        onApprove={onApproval}
        onView={setDetail}
        onRefresh={refresh}
      />

      {/* Vòng 2: Admin duyệt cuối */}
      <PendingSection
        title="Vòng 2 — Admin duyệt cuối"
        subtitle={
          "Chỉ Admin và Super Admin có thể duyệt vòng này. Sau khi duyệt, hệ thống sẽ gửi email mời đặt mật khẩu."
        }
        list={pendingAdmin}
        loading={loading}
        busy={busy}
        approveLabel="Duyệt cuối"
        approveAction="approve_admin"
        canApprove={isAdmin}
        onApprove={onApproval}
        onView={setDetail}
        onRefresh={refresh}
      />

      <ApplicantDetailDialog
        applicant={detail}
        open={Boolean(detail)}
        onOpenChange={(o) => { if (!o) setDetail(null); }}
      />

      {/* Invite links — only super_admin can create */}
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-base font-bold uppercase tracking-[0.06em]">Link mời gia nhập team</CardTitle>
          <CardDescription>Tạo và quản lý các link mời thành viên mới. Chỉ Super Admin có thể tạo.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
        {canCreate && (
          <div className="space-y-2 rounded-lg border bg-muted/30 p-4">
            <div className="grid gap-2 sm:grid-cols-[1fr,110px,110px,auto]">
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Ghi chú (vd. 'Đợt mời tháng 4')"
                maxLength={80}
                className="h-10"
              />
              <div className="space-y-0.5">
                <Input
                  type="number"
                  min={1}
                  max={30}
                  value={days}
                  onChange={(e) => setDays(Math.max(1, Math.min(30, Number(e.target.value) || 7)))}
                  className="h-10"
                />
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Ngày hết hạn</p>
              </div>
              <div className="space-y-0.5">
                <Input
                  type="number"
                  min={1}
                  max={500}
                  value={maxUses}
                  onChange={(e) => setMaxUses(Math.max(1, Math.min(500, Number(e.target.value) || 1)))}
                  className="h-10"
                />
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Số lượt dùng</p>
              </div>
              <Button onClick={() => void onCreate()} disabled={creating} className="h-10 gap-1.5 rounded-xl">
                <Plus className="size-4" /> {creating ? "Đang tạo..." : "Tạo & Copy"}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Đặt &ldquo;Số lượt dùng&rdquo; &gt; 1 để 1 link mời cùng lúc nhiều người (vd. 50 — phù hợp gửi vào group).
            </p>
          </div>
        )}

        {invites.length === 0 ? (
          <p className="text-xs text-muted-foreground">Chưa có mã mời nào.</p>
        ) : (
          <div className="space-y-3">
            {invites.map((inv) => {
              const expired = new Date(inv.expires_at).getTime() < Date.now();
              const max = Number(inv.max_uses ?? 1);
              const used = Number(inv.uses_count ?? (inv.used_at ? 1 : 0));
              const fullyUsed = used >= max;
              return (
                <div key={inv.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md border p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {inv.label ?? "(không nhãn)"}
                      <span className={cn(
                        "ml-2 rounded-full border px-1.5 py-0.5 text-[10px] font-bold",
                        fullyUsed ? "border-muted-foreground/30 bg-muted text-muted-foreground"
                          : expired ? "border-rose-500/30 bg-rose-500/10 text-rose-500"
                          : "border-emerald-500/30 bg-emerald-500/10 text-emerald-500",
                      )}>
                        {fullyUsed ? "HẾT LƯỢT" : expired ? "HẾT HẠN" : "CÒN HIỆU LỰC"}
                      </span>
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      Đã dùng <span className="font-semibold text-foreground">{used}</span>/{max} lượt · Hết hạn{" "}
                      {new Date(inv.expires_at).toLocaleString("vi-VN")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!fullyUsed && !expired && (
                      <Button size="sm" variant="outline" onClick={() => void copyUrl(inv.token)} className="gap-1 rounded-lg">
                        <Copy className="size-3.5" /> Copy
                      </Button>
                    )}
                    {canCreate && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy === inv.id}
                        onClick={() => void onRevoke(inv.id)}
                        className="gap-1 rounded-lg border-rose-500/40 text-rose-500 hover:bg-rose-500/10"
                      >
                        {busy === inv.id ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </CardContent>
      </Card>
    </div>
  );
}

function PendingSection({
  title, subtitle, list, loading, busy, approveLabel, approveAction, canApprove,
  onApprove, onView, onRefresh,
}: {
  title: string;
  subtitle: string;
  list: Pending[];
  loading: boolean;
  busy: string | null;
  approveLabel: string;
  approveAction: "approve_it" | "approve_admin";
  canApprove: boolean;
  onApprove: (userId: string, action: "approve_it" | "approve_admin" | "reject") => void;
  onView: (p: ApplicantDetail) => void;
  onRefresh: () => void;
}) {
  const handleApprove = (userId: string) => onApprove(userId, approveAction);
  const handleReject = (userId: string) => onApprove(userId, "reject");

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div className="flex-1">
          <CardTitle className="font-heading text-base font-bold uppercase tracking-[0.06em]">
            {title} ({loading ? "..." : list.length})
          </CardTitle>
          <CardDescription className="mt-1">{subtitle}</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={() => onRefresh()} disabled={loading} className="gap-1.5">
          <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
          Làm mới
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Đang tải danh sách...</p>
        ) : list.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Không có đơn ứng tuyển nào trong vòng này.</p>
        ) : (
          <div className="space-y-4">
            {list.map((p) => (
              <Card key={p.id} className="bg-background/50">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="truncate text-base">{p.display_name ?? p.email}</CardTitle>
                      <CardDescription className="truncate">{p.email}</CardDescription>
                      {p.applied_role && (
                        <p className="mt-1 truncate text-xs font-semibold text-primary dark:text-amber-400">
                          Ứng tuyển: {p.applied_role}
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onView(p)}
                      className="gap-1.5"
                      title="Xem đầy đủ thông tin"
                    >
                      <Eye className="size-4" />
                      <span className="hidden sm:inline">Xem chi tiết</span>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {p.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="size-4 flex-shrink-0" />
                      <span className="font-mono">{p.phone}</span>
                    </div>
                  )}
                  {Array.isArray(p.game_profiles) && p.game_profiles.length > 0 && (
                    <div className="flex items-start gap-2 text-muted-foreground">
                      <Gamepad2 className="size-4 flex-shrink-0 translate-y-0.5" />
                      <div className="flex flex-wrap gap-1.5">
                        {p.game_profiles.map((g, i) => (
                          <span key={i} className="inline-flex items-center gap-1.5 rounded-md border bg-card px-2 py-0.5 font-mono text-[11px]">
                            <span className="font-bold uppercase text-primary dark:text-amber-400">{g.custom_label || g.game.replace("_", " ")}</span>
                            <span>{g.uid}</span>
                            {g.nickname && <span className="text-muted-foreground">({g.nickname})</span>}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {p.application_note && (
                    <div className="flex items-start gap-2 text-muted-foreground">
                      <FileText className="size-4 flex-shrink-0 translate-y-0.5" />
                      <p className="text-sm italic">&ldquo;{p.application_note}&rdquo;</p>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy === p.id}
                    onClick={() => handleReject(p.id)}
                    className="gap-1.5 rounded-lg border-rose-500/40 text-rose-500 hover:bg-rose-500/10 hover:text-rose-500"
                  >
                    <X className="size-4" />
                    Từ chối
                  </Button>
                  <Button
                    size="sm"
                    disabled={busy === p.id || !canApprove}
                    onClick={() => handleApprove(p.id)}
                    className="gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 hover:text-emerald-500 disabled:opacity-40"
                    title={canApprove ? approveLabel : "Bạn không có quyền duyệt vòng này"}
                  >
                    {busy === p.id ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                    {approveLabel}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
