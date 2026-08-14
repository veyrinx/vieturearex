"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowRightLeft, AlertTriangle, Loader2, RefreshCw, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { FailoverConfig } from "@/lib/constants/failover";

type ApiPayload = { config: FailoverConfig; currentHost: string };

export function FailoverPanel() {
  const [config, setConfig] = useState<FailoverConfig | null>(null);
  const [currentHost, setCurrentHost] = useState("");
  const [target, setTarget] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/failover", { cache: "no-store" });
      const json = (await res.json()) as ApiPayload & { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Không đọc được cấu hình.");
      setConfig(json.config);
      setCurrentHost(json.currentHost);
      setTarget(json.config.target);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không đọc được cấu hình.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function save(enabled: boolean) {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/failover", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled, target }),
      });
      const json = (await res.json()) as ApiPayload & { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Không lưu được.");
      setConfig(json.config);
      setTarget(json.config.target);
      toast.success(
        enabled
          ? `Đã bật. Khách vào máy này sẽ được đẩy sang ${json.config.target}.`
          : "Đã tắt. Khách ở lại máy này.",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không lưu được.");
    } finally {
      setSaving(false);
    }
  }

  const on = config?.enabled === true;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-sky-500/10">
          <ArrowRightLeft className="size-5 text-sky-500" />
        </div>
        <div>
          <h1 className="font-heading text-xl font-bold text-foreground">Chuyển hướng nhanh</h1>
          <p className="text-xs text-muted-foreground">
            Đẩy khách sang máy chủ còn sống ngay, không phải đợi DNS lan
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Đang đọc cấu hình...
        </div>
      ) : (
        <>
          <div
            className={cn(
              "rounded-xl border p-4",
              on ? "border-amber-500/40 bg-amber-500/10" : "border-border bg-card",
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <span
                    className={cn(
                      "size-2 rounded-full",
                      on ? "animate-pulse bg-amber-500" : "bg-emerald-500",
                    )}
                  />
                  {on ? "Đang đẩy khách đi nơi khác" : "Khách ở lại máy này"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Máy đang phục vụ trang này: <code className="font-mono">{currentHost || "?"}</code>
                  {on && config?.target && (
                    <> → đẩy sang <code className="font-mono">{config.target}</code></>
                  )}
                </p>
                {config?.updatedAt && (
                  <p className="text-[11px] text-muted-foreground">
                    Đổi lần cuối {new Date(config.updatedAt).toLocaleString("vi-VN")}
                    {config.updatedBy ? ` bởi ${config.updatedBy}` : ""}
                  </p>
                )}
              </div>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => void load()} disabled={saving}>
                <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
                Đọc lại
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Đẩy khách sang máy nào
            </label>
            <Input
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="https://vieturearex.vercel.app"
              className="font-mono text-sm"
              disabled={saving}
            />
            <p className="text-[11px] text-muted-foreground">
              Chỉ cần tên miền, phần đường dẫn sẽ bị bỏ. Khách đang xem trang nào thì sang máy kia vẫn
              ở đúng trang đó.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {on ? (
              <Button variant="destructive" onClick={() => void save(false)} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="size-4 animate-spin" /> : <ArrowRightLeft className="size-4" />}
                Tắt chuyển hướng
              </Button>
            ) : (
              <Button onClick={() => void save(true)} disabled={saving || !target.trim()} className="gap-2">
                {saving ? <Loader2 className="size-4 animate-spin" /> : <ArrowRightLeft className="size-4" />}
                Bật chuyển hướng
              </Button>
            )}
            {!on && config?.target && target !== config.target && (
              <Button variant="outline" onClick={() => setTarget(config.target)} disabled={saving}>
                Hoàn tác địa chỉ
              </Button>
            )}
          </div>

          <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4 text-xs text-muted-foreground">
            <p className="flex items-center gap-2 font-semibold text-foreground">
              <ShieldAlert className="size-4 text-amber-500" /> Cần biết trước khi bật
            </p>
            <ul className="space-y-1.5 pl-5 [&>li]:list-disc">
              <li>
                Mất tới <strong>30 giây</strong> để mọi tiến trình nhận lệnh — mỗi máy giữ cấu hình
                trong bộ nhớ 30 giây rồi mới hỏi lại.
              </li>
              <li>
                <code className="font-mono">/api/health</code> và <code className="font-mono">/api/cron</code>{" "}
                không bị đẩy. Giám sát phải thấy đúng tình trạng máy này, còn việc định kỳ phải chạy
                đúng nơi được gọi.
              </li>
              <li>
                Chuyển hướng dùng mã <strong>307</strong> nên trình duyệt không nhớ vĩnh viễn. Tắt
                công tắc là khách quay lại ngay, không phải xoá cache.
              </li>
              <li>
                Cả hai máy đọc chung một dòng cấu hình. Máy đích tự nhận ra mình là đích và không đẩy
                tiếp, nên không có vòng lặp.
              </li>
            </ul>
            <p className="flex items-start gap-2 border-t border-border pt-3 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              Đây không thay được việc đổi DNS. Máy này còn sống mới đẩy khách đi được — nó chết hẳn
              thì phải trỏ DNS sang máy kia.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
