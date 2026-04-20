"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AdminLoginAnimation,
  type AdminLoginAnimationState,
} from "@/components/auth/admin-login-animation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, ShieldAlert } from "lucide-react";

const BAN_DURATION_DAYS = 30;

type ServerCheckResult =
  | { status: "ok" }
  | { status: "warn"; attemptsLeft: number }
  | { status: "banned"; bannedUntil: number };

async function serverCheck(): Promise<ServerCheckResult> {
  const res = await fetch("/api/auth/login-check").catch(() => null);
  if (!res?.ok) return { status: "ok" };
  return res.json().catch(() => ({ status: "ok" })) as Promise<ServerCheckResult>;
}

async function serverRecordFail(email: string): Promise<ServerCheckResult> {
  const res = await fetch("/api/auth/login-check", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ success: false, email }),
  }).catch(() => null);
  if (!res?.ok) return { status: "ok" };
  return res.json().catch(() => ({ status: "ok" })) as Promise<ServerCheckResult>;
}

async function serverRecordSuccess(email: string): Promise<void> {
  await fetch("/api/auth/login-check", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ success: true, email }),
  }).catch(() => null);
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [animationState, setAnimationState] = useState<AdminLoginAnimationState>("idle");
  const [attemptKey, setAttemptKey] = useState(0);
  const [resultMessage, setResultMessage] = useState("");
  const [banState, setBanState] = useState<ServerCheckResult>({ status: "ok" });
  const [authError, setAuthError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setAuthError(params.get("error"));
  }, []);

  // Check server-side ban on mount
  useEffect(() => {
    serverCheck().then(setBanState);
  }, []);

  useEffect(() => {
    if (authError === "google_not_allowed") {
      toast.error("EMAIL GOOGLE CHƯA ĐƯỢC CẤP QUYỀN QUẢN TRỊ. VUI LÒNG LIÊN HỆ QUẢN TRỊ VIÊN.");
    }
    if (authError === "missing_user") {
      toast.error("KHÔNG THỂ XÁC MINH THÔNG TIN TÀI KHOẢN GOOGLE.");
    }
  }, [authError]);

  const beginLoading = () => {
    setAttemptKey((v) => v + 1);
    setAnimationState("loading");
    setResultMessage("");
  };

  const finishAttempt = (
    state: Extract<AdminLoginAnimationState, "success" | "error">,
    message: string,
  ) => {
    setResultMessage(message);
    setAnimationState(state);
  };

  const handleAnimationResultComplete = (state: Extract<AdminLoginAnimationState, "success" | "error">) => {
    const fallback = state === "success"
      ? "ĐĂNG NHẬP THÀNH CÔNG. ĐANG CHUYỂN VÀO TRANG QUẢN TRỊ."
      : "THÔNG TIN ĐĂNG NHẬP KHÔNG CHÍNH XÁC.";
    const message = resultMessage || fallback;

    if (state === "success") {
      toast.success(message);
      window.setTimeout(async () => {
        const { path } = await fetch("/api/auth/pop-next")
          .then((r) => r.json())
          .catch(() => ({ path: "/admin" })) as { path: string };
        router.push(path);
        router.refresh();
      }, 300);
      return;
    }

    toast.error(message);
    window.setTimeout(() => {
      setAnimationState("idle");
      setResultMessage("");
    }, 250);
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // Check server-side ban trước
    const check = await serverCheck();
    setBanState(check);
    if (check.status === "banned") return;

    if (!email.trim()) {
      toast.error("VUI LÒNG NHẬP EMAIL.");
      return;
    }
    if (!password.trim()) {
      toast.error("VUI LÒNG NHẬP MẬT KHẨU.");
      return;
    }

    setLoading(true);
    beginLoading();

    const supabase = createClient();
    if (!supabase) {
      setLoading(false);
      finishAttempt("success", "ĐĂNG NHẬP THÀNH CÔNG.");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      const result = await serverRecordFail(email);
      setBanState(result);

      if (result.status === "banned") {
        finishAttempt("error", `BỊ CHẶN ${BAN_DURATION_DAYS} NGÀY DO CỐ TÌNH XÂM NHẬP HỆ THỐNG.`);
        return;
      }

      const msg = error.message?.toLowerCase() ?? "";
      if (msg.includes("invalid login credentials")) {
        finishAttempt("error", "EMAIL CHƯA ĐƯỢC CẤP QUYỀN HOẶC MẬT KHẨU SAI. VUI LÒNG LIÊN HỆ QUẢN TRỊ VIÊN ĐỂ ĐƯỢC CẤP QUYỀN TRUY CẬP.");
      } else {
        finishAttempt("error", "THÔNG TIN ĐĂNG NHẬP KHÔNG CHÍNH XÁC HOẶC TÀI KHOẢN CHƯA ĐƯỢC CẤP QUYỀN.");
      }
      return;
    }

    // Bước 2: Verify user có trong bảng users (đã được cấp quyền)
    // Session cookie đã được set, server tự lấy email từ session
    const profileRes = await fetch("/api/auth/login-check?verify=1");
    const profileData = await profileRes.json().catch(() => ({ allowed: true })) as { allowed?: boolean };

    if (profileData.allowed === false) {
      await supabase.auth.signOut();
      const result = await serverRecordFail(email);
      setBanState(result);
      finishAttempt("error", "TÀI KHOẢN CHƯA ĐƯỢC CẤP QUYỀN TRUY CẬP QUẢN TRỊ. VUI LÒNG LIÊN HỆ QUẢN TRỊ VIÊN.");
      return;
    }

    await serverRecordSuccess(email);
    finishAttempt("success", "ĐĂNG NHẬP THÀNH CÔNG. ĐANG CHUYỂN VÀO TRANG QUẢN TRỊ.");
  };



  const banDaysLeft = banState.status === "banned"
    ? Math.ceil((banState.bannedUntil - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

  if (banState.status === "banned" && banState.bannedUntil > Date.now()) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-10">
        <section className="w-full max-w-md rounded-2xl border border-destructive/50 bg-card p-8 shadow-[0_20px_60px_rgba(220,38,38,0.15)]">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <ShieldAlert className="size-8 text-destructive" />
            </div>
            <h1 className="font-heading text-xl font-bold uppercase tracking-[0.08em] text-destructive">
              TRUY CẬP BỊ CHẶN
            </h1>
            <p className="text-sm text-muted-foreground">
              IP này đã bị khóa <span className="font-bold text-destructive">{BAN_DURATION_DAYS} ngày</span> do cố tình đăng nhập sai nhiều lần.
            </p>
            <div className="w-full rounded-xl border border-destructive/30 bg-destructive/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-destructive">
                Còn {banDaysLeft} ngày bị chặn
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Hết hạn: {new Date(banState.bannedUntil).toLocaleDateString("vi-VN", {
                  day: "2-digit", month: "2-digit", year: "numeric",
                  hour: "2-digit", minute: "2-digit",
                })}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Hoạt động này đã được ghi lại vào nhật ký hệ thống. Nếu đây là nhầm lẫn, vui lòng liên hệ quản trị viên.
            </p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center px-4 py-10 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/3 dark:from-amber-500/5 dark:to-amber-400/3" />
      <div className="pointer-events-none absolute -top-32 -left-32 h-80 w-80 rounded-full bg-primary/10 blur-[100px] dark:bg-amber-500/10" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-80 w-80 rounded-full bg-primary/8 blur-[100px] dark:bg-amber-400/8" />
      <section className="relative z-10 w-full max-w-md rounded-3xl border border-border/60 bg-card/95 p-8 shadow-[0_24px_64px_rgba(2,6,23,0.12)] backdrop-blur-xl">
        <div className="mb-6 text-center">
          <AdminLoginAnimation
            state={animationState}
            attemptKey={attemptKey}
            onResultComplete={handleAnimationResultComplete}
          />
          <div className="flex flex-col items-center gap-2">
            <h1 className="font-heading text-2xl font-bold uppercase tracking-[0.08em] text-foreground">
              ĐĂNG NHẬP QUẢN TRỊ
            </h1>
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
              AREX · HỆ THỐNG QUẢN TRỊ NỘI DUNG
            </p>
          </div>
        </div>

        {banState.status === "warn" && (
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-3">
            <ShieldAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-destructive">
              CẢNH BÁO: BẠN ĐÃ BỊ PHÁT HIỆN CỐ TÌNH XÂM NHẬP HỆ THỐNG TRÁI PHÉP. CÒN {banState.attemptsLeft} LẦN TRƯỚC KHI BỊ CHẶN {BAN_DURATION_DAYS} NGÀY.
            </p>
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-3">
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="EMAIL QUẢN TRỊ"
            className="h-11 rounded-xl"
          />
          <div className="relative">
            <Input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type={showPassword ? "text" : "password"}
              placeholder="MẬT KHẨU"
              className="h-11 rounded-xl pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors z-10 p-1"
              aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <Button type="submit" disabled={loading} className="h-11 w-full rounded-xl">
            {loading ? "ĐANG ĐĂNG NHẬP..." : "ĐĂNG NHẬP"}
          </Button>
        </form>

        <div className="mt-3 flex items-center justify-end text-sm">
          <Link href="/auth/forgot-password" className="font-medium uppercase tracking-[0.08em] text-muted-foreground transition hover:text-foreground">
            QUÊN MẬT KHẨU?
          </Link>
        </div>

      </section>
    </main>
  );
}
