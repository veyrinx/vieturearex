"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, Plus, Trash2, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Invite = {
  id: string;
  token: string;
  label: string | null;
  used_at: string | null;
  expires_at: string;
  created_at: string;
};

type Pending = {
  id: string;
  email: string;
  display_name: string | null;
  role: string;
  team_status: string | null;
  created_at: string;
  avatar_url: string | null;
};

export function TeamInvitesPanel({ canCreate }: { canCreate: boolean }) {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [pending, setPending] = useState<Pending[]>([]);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState("");
  const [days, setDays] = useState(7);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

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
        const d = (await pRes.json()) as { pending: Pending[] };
        setPending(d.pending ?? []);
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
        body: JSON.stringify({ label: label.trim() || undefined, expiresInDays: days }),
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

  const onApproval = async (userId: string, action: "approve" | "reject") => {
    setBusy(userId);
    try {
      const res = await fetch("/api/admin/team/approval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) { toast.error(data.error ?? "Không thực hiện được."); return; }
      toast.success(action === "approve" ? "Đã duyệt." : "Đã từ chối.");
      void refresh();
    } finally { setBusy(null); }
  };

  return (
    <div className="space-y-6">
      {/* Pending approvals — visible to IT+ */}
      <section className="glass-card rounded-2xl p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-heading text-base font-bold uppercase tracking-[0.06em]">
            Yêu cầu chờ duyệt ({pending.length})
          </h2>
          <button onClick={() => void refresh()} className="text-xs text-muted-foreground hover:text-foreground">
            Làm mới
          </button>
        </div>
        {loading ? (
          <p className="text-xs text-muted-foreground">Đang tải...</p>
        ) : pending.length === 0 ? (
          <p className="text-xs text-muted-foreground">Không có yêu cầu nào.</p>
        ) : (
          <div className="divide-y divide-border">
            {pending.map((p) => (
              <div key={p.id} className="flex items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{p.display_name ?? p.email}</p>
                  <p className="truncate text-xs text-muted-foreground">{p.email}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy === p.id}
                  onClick={() => void onApproval(p.id, "approve")}
                  className="gap-1 rounded-lg border-emerald-500/40 text-emerald-500 hover:bg-emerald-500/10"
                >
                  {busy === p.id ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                  Duyệt
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy === p.id}
                  onClick={() => void onApproval(p.id, "reject")}
                  className="gap-1 rounded-lg border-rose-500/40 text-rose-500 hover:bg-rose-500/10"
                >
                  <X className="size-3.5" />
                  Từ chối
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Invite links — only super_admin can create */}
      <section className="glass-card rounded-2xl p-5">
        <h2 className="mb-3 font-heading text-base font-bold uppercase tracking-[0.06em]">
          Link mời gia nhập team
        </h2>

        {canCreate && (
          <div className="mb-4 grid gap-2 sm:grid-cols-[1fr,120px,auto]">
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Ghi chú (vd. 'Đợt mời tháng 4')"
              maxLength={80}
              className="h-10"
            />
            <Input
              type="number"
              min={1}
              max={30}
              value={days}
              onChange={(e) => setDays(Math.max(1, Math.min(30, Number(e.target.value) || 7)))}
              className="h-10"
            />
            <Button onClick={() => void onCreate()} disabled={creating} className="gap-1.5 rounded-xl">
              <Plus className="size-4" /> {creating ? "Đang tạo..." : "Tạo & Copy"}
            </Button>
          </div>
        )}

        {invites.length === 0 ? (
          <p className="text-xs text-muted-foreground">Chưa có mã mời nào.</p>
        ) : (
          <div className="divide-y divide-border">
            {invites.map((inv) => {
              const expired = new Date(inv.expires_at).getTime() < Date.now();
              const used = Boolean(inv.used_at);
              return (
                <div key={inv.id} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {inv.label ?? "(không nhãn)"}
                      <span className={cn(
                        "ml-2 rounded-full border px-1.5 py-0.5 text-[10px] font-bold",
                        used ? "border-muted-foreground/30 bg-muted text-muted-foreground"
                          : expired ? "border-rose-500/30 bg-rose-500/10 text-rose-500"
                          : "border-emerald-500/30 bg-emerald-500/10 text-emerald-500",
                      )}>
                        {used ? "ĐÃ DÙNG" : expired ? "HẾT HẠN" : "CÒN HIỆU LỰC"}
                      </span>
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      Hết hạn {new Date(inv.expires_at).toLocaleString("vi-VN")}
                    </p>
                  </div>
                  {!used && !expired && (
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
                      <Trash2 className="size-3.5" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
