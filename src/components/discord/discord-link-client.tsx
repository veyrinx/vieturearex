"use client";

import { useEffect, useState } from "react";
import { BadgeCheck, Copy, Link2Off, Loader2, RefreshCw, Timer } from "lucide-react";
import { toast } from "sonner";

type Status = { linked: boolean; username: string | null; linkedAt: string | null };

/**
 * Nối tài khoản Arex với Discord.
 *
 * Cách làm giống Telegram: web phát mã 6 ký tự sống 10 phút, người dùng gõ
 * `/lienket <mã>` trong server Discord. Không cần OAuth vì bot không đụng gì
 * vào tài khoản Discord ngoài việc gán role.
 */
export function DiscordLinkClient() {
  const [status, setStatus] = useState<Status | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [busy, setBusy] = useState(false);

  const loadStatus = async () => {
    try {
      const res = await fetch("/api/discord/link/code");
      if (!res.ok) return setStatus({ linked: false, username: null, linkedAt: null });
      setStatus((await res.json()) as Status);
    } catch {
      setStatus({ linked: false, username: null, linkedAt: null });
    }
  };

  useEffect(() => { void loadStatus(); }, []);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [secondsLeft]);

  const createCode = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/discord/link/code", { method: "POST" });
      const d = (await res.json()) as { code?: string; expiresInSec?: number; error?: string };
      if (!res.ok || !d.code) {
        toast.error(d.error ?? "Không tạo được mã.");
        return;
      }
      setCode(d.code);
      setSecondsLeft(d.expiresInSec ?? 600);
    } catch {
      toast.error("Lỗi mạng, thử lại.");
    } finally {
      setBusy(false);
    }
  };

  const unlink = async () => {
    setBusy(true);
    try {
      await fetch("/api/discord/link/code", { method: "DELETE" });
      setCode(null);
      await loadStatus();
      toast.success("Đã gỡ liên kết Discord.");
    } finally {
      setBusy(false);
    }
  };

  if (!status) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-border bg-card py-12 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {status.linked ? (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4">
          <p className="flex items-center gap-1.5 text-sm font-black text-emerald-600 dark:text-emerald-400">
            <BadgeCheck className="size-4" /> Đã nối với Discord
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {status.username ? `Tài khoản @${status.username}. ` : ""}
            Bạn nhận được tin nhắn riêng khi đơn hàng đổi trạng thái, và có role tương ứng trong
            server.
          </p>
          <button
            onClick={() => void unlink()}
            disabled={busy}
            className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground transition hover:border-red-500/40 hover:text-red-500 disabled:opacity-60"
          >
            <Link2Off className="size-3.5" /> Gỡ liên kết
          </button>
        </div>
      ) : (
        <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
          <ol className="space-y-1.5 text-xs text-muted-foreground">
            <li><b className="text-foreground">1.</b> Bấm nút bên dưới để lấy mã.</li>
            <li><b className="text-foreground">2.</b> Vào server Discord của Arex.</li>
            <li>
              <b className="text-foreground">3.</b> Gõ <code className="rounded bg-muted px-1">/lienket</code>{" "}
              rồi dán mã vào.
            </li>
          </ol>

          {code ? (
            <div className="space-y-2">
              <button
                onClick={() => { void navigator.clipboard.writeText(code); toast.success("Đã copy mã"); }}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 py-4 font-heading text-3xl font-black tracking-[0.4em] text-primary transition hover:bg-primary/10 dark:border-amber-400/40 dark:text-amber-400"
              >
                {code} <Copy className="size-4" />
              </button>
              <p className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
                <Timer className="size-3" />
                {secondsLeft > 0
                  ? `Còn hiệu lực ${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}`
                  : "Mã đã hết hạn — tạo mã mới"}
              </p>
            </div>
          ) : null}

          <button
            onClick={() => void createCode()}
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-black text-white transition hover:opacity-90 disabled:opacity-60 dark:bg-amber-500"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            {code ? "Tạo mã mới" : "Lấy mã liên kết"}
          </button>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-muted/20 p-3 text-[11px] leading-relaxed text-muted-foreground">
        <p className="mb-1 font-bold text-foreground">Nối rồi thì làm được gì trong Discord</p>
        <ul className="space-y-0.5">
          <li>• <code className="rounded bg-muted px-1">/toi</code> — xem vai trò, gian hàng, đơn đang chạy</li>
          <li>• <code className="rounded bg-muted px-1">/cho don AX-…</code> — tra trạng thái đơn</li>
          <li>• Nhận tin nhắn riêng mỗi khi đơn sang bước mới</li>
          <li>• Được gán role Người bán / Giao dịch viên đúng với vai trò trên web</li>
        </ul>
      </div>
    </div>
  );
}
