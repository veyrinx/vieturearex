"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Profile = { display_name: string | null; ff_id: string | null };

export default function SetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [ffId, setFfId] = useState("");

  useEffect(() => {
    fetch("/api/user/profile", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((p: Profile | null) => {
        if (!p) { router.replace("/login"); return; }
        if (p.display_name && p.ff_id) { router.replace("/profile"); return; }
        setDisplayName(p.display_name ?? "");
        setFfId(p.ff_id ?? "");
        setLoading(false);
      })
      .catch(() => { router.replace("/login"); });
  }, [router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) { toast.error("Vui lòng nhập tên hiển thị."); return; }
    if (!/^\d{6,12}$/.test(ffId.trim())) { toast.error("FF ID phải là 6–12 chữ số."); return; }

    setSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ display_name: displayName.trim(), ff_id: ffId.trim() }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { error?: string };
        toast.error(d.error ?? "Lưu thất bại.");
        return;
      }
      toast.success("Hồ sơ đã được lưu!");
      const next = new URLSearchParams(window.location.search).get("next") ?? "/";
      router.push(next);
    } catch {
      toast.error("Lỗi mạng, vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-3">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 dark:bg-amber-400/10">
            <Flame className="size-7 text-primary dark:text-amber-400" />
          </div>
          <h1 className="font-heading text-2xl font-bold uppercase tracking-[0.06em]">
            Hoàn thiện hồ sơ
          </h1>
          <p className="text-sm text-muted-foreground">
            Hoàn thiện hồ sơ để tham gia giải đấu
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Tên hiển thị <span className="text-destructive">*</span>
              </label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Nickname của bạn"
                maxLength={80}
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                FF ID <span className="text-destructive">*</span>
              </label>
              <Input
                value={ffId}
                onChange={(e) => setFfId(e.target.value.replace(/\D/g, ""))}
                placeholder="6–12 chữ số"
                maxLength={12}
                inputMode="numeric"
                className="h-11 rounded-xl font-mono"
              />
              <p className="text-[11px] text-muted-foreground">ID trong game Free Fire của bạn (chỉ số, 6–12 ký tự)</p>
            </div>
            <Button type="submit" disabled={saving} className="h-11 w-full rounded-xl font-bold">
              {saving ? "Đang lưu..." : "Bắt đầu →"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
