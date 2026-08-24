"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Flame, User, Gamepad2, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Profile = { display_name: string | null; ff_id: string | null };

/**
 * Bước hoàn thiện hồ sơ.
 *
 * FF ID KHÔNG còn là cửa ải của việc đăng ký: phần lớn người vào Arex chỉ đọc
 * tin, đi chợ hay lên diễn đàn, bắt họ khai ID game trước khi được dùng site
 * là chặn nhầm người.
 *
 * Trang này giờ chỉ bắt buộc FF ID khi được gọi kèm `?need=ff` — tức người
 * dùng đang đi vào một luồng thật sự cần nó (lập team, tham gia giải, nộp kết
 * quả). Không có tham số đó thì ô FF ID vẫn hiện nhưng để trống cũng qua.
 */
export default function SetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [ffId, setFfId] = useState("");
  const [needFf, setNeedFf] = useState(false);

  useEffect(() => {
    // Đọc thẳng từ window thay vì useSearchParams để trang không phải bọc
    // Suspense — trang này vốn đã là client component và luôn chạy ở trình duyệt.
    const params = new URLSearchParams(window.location.search);
    const requireFf = params.get("need") === "ff";
    const next = params.get("next");
    setNeedFf(requireFf);

    fetch("/api/user/profile", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((p: Profile | null) => {
        if (!p) { router.replace("/login"); return; }
        // Đã đủ thứ trang này cần thì đi tiếp luôn, đừng bắt bấm thêm một nút.
        if (p.display_name && (!requireFf || p.ff_id)) {
          router.replace(next ?? "/profile");
          return;
        }
        setDisplayName(p.display_name ?? "");
        setFfId(p.ff_id ?? "");
        setLoading(false);
      })
      .catch(() => { router.replace("/login"); });
  }, [router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) { toast.error("Vui lòng nhập tên hiển thị."); return; }
    const ff = ffId.trim();
    if (needFf && !ff) { toast.error("Luồng này cần FF ID để tiếp tục."); return; }
    // Để trống thì thôi, nhưng đã gõ thì phải đúng dạng — lưu một ID sai còn
    // tệ hơn không lưu gì.
    if (ff && !/^\d{6,12}$/.test(ff)) { toast.error("FF ID phải là 6–12 chữ số."); return; }

    setSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ display_name: displayName.trim(), ff_id: ff }),
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

  const ffIdValid = /^\d{6,12}$/.test(ffId.trim());
  const canSubmit =
    displayName.trim().length > 0 &&
    (ffId.trim() === "" ? !needFf : ffIdValid);

  return (
    <div className="relative flex min-h-[85vh] items-center justify-center px-4 py-10 overflow-hidden">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/4 top-1/4 size-[500px] rounded-full bg-primary/8 blur-[120px] dark:bg-amber-400/6" />
        <div className="absolute right-1/4 bottom-1/4 size-[400px] rounded-full bg-orange-500/5 blur-[100px]" />
      </div>

      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="relative mx-auto w-fit">
            <div className="absolute inset-0 animate-pulse rounded-3xl bg-primary/30 blur-xl dark:bg-amber-400/20" />
            <div className="relative flex size-16 items-center justify-center rounded-3xl bg-gradient-to-br from-primary to-primary/70 shadow-lg dark:from-amber-400 dark:to-orange-500">
              <Flame className="size-8 text-white" />
            </div>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary dark:text-amber-400">Welcome</p>
            <h1 className="mt-1 font-heading text-3xl font-black uppercase tracking-[0.04em] text-foreground">
              Hoàn thiện hồ sơ
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {needFf
                ? "Cần FF ID để đi tiếp vào giải đấu"
                : "Vài thông tin cuối để bắt đầu hành trình của bạn"}
            </p>
          </div>
        </div>

        {/* Form card */}
        <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-xl">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent dark:via-amber-400/40" />
          <form onSubmit={(e) => void onSubmit(e)} className="space-y-5">
            {/* Display name */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                <User className="size-3.5" /> Tên hiển thị <span className="text-destructive">*</span>
              </label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Nickname của bạn"
                maxLength={80}
                className="h-12 rounded-xl text-sm"
              />
              <p className="text-[11px] text-muted-foreground">
                {displayName.length > 0 ? `${displayName.length}/80 ký tự` : "Hiển thị trên bình luận và hồ sơ công khai"}
              </p>
            </div>

            {/* FF ID */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                <Gamepad2 className="size-3.5 text-amber-500" /> FF ID{" "}
                {needFf ? (
                  <span className="text-destructive">*</span>
                ) : (
                  <span className="ml-auto text-[10px] font-normal normal-case tracking-normal text-muted-foreground/60">
                    Không bắt buộc
                  </span>
                )}
              </label>
              <div className="relative">
                <Input
                  value={ffId}
                  onChange={(e) => setFfId(e.target.value.replace(/\D/g, ""))}
                  placeholder="123456789"
                  maxLength={12}
                  inputMode="numeric"
                  className="h-12 rounded-xl font-mono text-sm pr-16"
                />
                {ffId && (
                  <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold ${ffIdValid ? "text-emerald-500" : "text-red-400"}`}>
                    {ffIdValid ? "✓ Hợp lệ" : "6–12 số"}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                {needFf
                  ? "Luồng giải đấu cần ID trong game Free Fire để ghép bạn vào đúng đội."
                  : "ID trong game Free Fire — chỉ cần khi bạn chơi giải, để trống cũng được."}
              </p>
            </div>

            <Button
              type="submit"
              disabled={saving || !canSubmit}
              className="h-12 w-full rounded-xl font-bold tracking-wide gap-2 shadow-lg shadow-primary/20 dark:shadow-amber-400/15"
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
              {saving ? "Đang lưu..." : "Bắt đầu"}
            </Button>
          </form>
        </div>

        {/* Footer hint */}
        <p className="text-center text-xs text-muted-foreground/70">
          Bạn có thể cập nhật thông tin sau tại{" "}
          <span className="text-foreground/80">Hồ sơ</span>
        </p>
      </div>
    </div>
  );
}
