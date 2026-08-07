"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Eye, EyeOff, Loader2, ShieldAlert, ShieldCheck, Smartphone } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/**
 * Trang đăng nhập SSO cho app Arex Hub.
 *
 * App mở trang này bằng trình duyệt hệ thống kèm `?c=<challenge>`. Ai đã đăng
 * nhập sẵn trên trình duyệt thì chỉ việc bấm "Mở Arex Hub"; ai chưa thì đăng
 * nhập ngay tại đây (kể cả bằng Google — thứ WebView trong app không làm được).
 * Xong xuôi trang đá ngược về `arexhub://sso?grant=…`.
 */

type Stage =
  | { kind: "loading" }
  | { kind: "no-challenge" }
  | { kind: "signin"; error: string | null }
  | { kind: "ready"; email: string; deepLink: string }
  | { kind: "denied"; message: string };

const RETURN_DELAY_MS = 400;

export default function HubSsoPage() {
  const [challenge, setChallenge] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>({ kind: "loading" });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const issuing = useRef(false);

  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get("c");
    if (!raw) {
      setStage({ kind: "no-challenge" });
      return;
    }
    setChallenge(raw);
  }, []);

  /** Xin vé cho phiên hiện tại rồi chuyển về app. */
  const issueGrant = useCallback(async (ch: string) => {
    if (issuing.current) return;
    issuing.current = true;
    try {
      const res = await fetch("/api/auth/hub-sso/issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challenge: ch }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        deepLink?: string;
        email?: string;
        error?: string;
      };

      if (res.status === 401) {
        setStage({ kind: "signin", error: null });
        return;
      }
      if (!res.ok || !data.deepLink) {
        setStage({ kind: "denied", message: data.error ?? "Không cấp được quyền vào Arex Hub." });
        return;
      }

      setStage({ kind: "ready", email: data.email ?? "", deepLink: data.deepLink });
      window.setTimeout(() => {
        window.location.href = data.deepLink!;
      }, RETURN_DELAY_MS);
    } catch {
      setStage({ kind: "denied", message: "Không kết nối được máy chủ — kiểm tra mạng." });
    } finally {
      issuing.current = false;
    }
  }, []);

  // Có challenge rồi thì thử ngay bằng phiên sẵn có của trình duyệt.
  useEffect(() => {
    if (!challenge) return;
    void issueGrant(challenge);
  }, [challenge, issueGrant]);

  async function handlePasswordLogin(event: React.FormEvent) {
    event.preventDefault();
    if (!challenge) return;

    const supabase = createClient();
    if (!supabase) {
      setStage({ kind: "signin", error: "Máy chủ chưa cấu hình đăng nhập." });
      return;
    }

    setBusy(true);
    try {
      // Dùng chung bộ đếm chống dò mật khẩu với /auth/login.
      const guard = (await fetch("/api/auth/login-check")
        .then((r) => r.json())
        .catch(() => ({ status: "ok" }))) as { status?: string };
      if (guard.status === "banned") {
        setStage({ kind: "denied", message: "IP này đang bị chặn do đăng nhập sai nhiều lần." });
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        await fetch("/api/auth/login-check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ success: false, email }),
        }).catch(() => null);

        const lower = error.message?.toLowerCase() ?? "";
        setStage({
          kind: "signin",
          error: lower.includes("invalid login credentials")
            ? "Email hoặc mật khẩu không đúng. Tài khoản đăng ký bằng Google thì bấm nút Google bên dưới."
            : error.message,
        });
        return;
      }

      await fetch("/api/auth/login-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ success: true, email }),
      }).catch(() => null);

      setStage({ kind: "loading" });
      await issueGrant(challenge);
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogleLogin() {
    if (!challenge) return;
    const supabase = createClient();
    if (!supabase) return;

    setBusy(true);
    const next = `/auth/hub?c=${encodeURIComponent(challenge)}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/oauth-callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      setBusy(false);
      setStage({ kind: "signin", error: error.message });
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#070b14] px-5 py-10 text-white">
      <section className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center">
          <div className="grid size-14 place-items-center rounded-2xl bg-violet-500/15 text-violet-300">
            <Smartphone className="size-7" />
          </div>
          <h1 className="mt-4 text-2xl font-semibold">Arex Hub</h1>
          <p className="mt-1.5 text-[13px] text-white/50">Đăng nhập để mở app quản trị</p>
        </div>

        <div className="mt-8">
          {stage.kind === "loading" && (
            <div className="flex flex-col items-center gap-3 py-10 text-white/60">
              <Loader2 className="size-6 animate-spin" />
              <p className="text-sm">Đang kiểm tra tài khoản…</p>
            </div>
          )}

          {stage.kind === "no-challenge" && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center">
              <p className="text-sm leading-relaxed text-white/70">
                Trang này chỉ dùng khi mở từ app <strong>Arex Hub</strong>. Hãy mở app rồi bấm
                “Đăng nhập bằng trình duyệt”.
              </p>
            </div>
          )}

          {stage.kind === "denied" && (
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-rose-500/25 bg-rose-500/[0.06] p-6 text-center">
              <div className="grid size-12 place-items-center rounded-2xl bg-rose-500/15 text-rose-300">
                <ShieldAlert className="size-6" />
              </div>
              <p className="text-sm leading-relaxed text-white/75">{stage.message}</p>
              <button
                type="button"
                onClick={async () => {
                  await createClient()?.auth.signOut();
                  setStage({ kind: "signin", error: null });
                }}
                className="text-[13px] font-medium text-violet-300 underline underline-offset-4"
              >
                Đăng nhập tài khoản khác
              </button>
            </div>
          )}

          {stage.kind === "ready" && (
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.06] p-6 text-center">
              <div className="grid size-12 place-items-center rounded-2xl bg-emerald-500/15 text-emerald-300">
                <ShieldCheck className="size-6" />
              </div>
              <div>
                <p className="text-sm font-medium">Đã xác thực</p>
                <p className="mt-1 text-[13px] break-all text-white/55">{stage.email}</p>
              </div>
              <a
                href={stage.deepLink}
                className="w-full rounded-xl bg-violet-500 px-5 py-3 text-[15px] font-semibold text-white"
              >
                Mở Arex Hub
              </a>
              <p className="text-[12px] leading-relaxed text-white/40">
                Màn hình không tự chuyển thì bấm nút bên trên. Vé đăng nhập hết hạn sau 3 phút.
              </p>
            </div>
          )}

          {stage.kind === "signin" && (
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-[13px] text-white/60">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  inputMode="email"
                  placeholder="admin@arexnetwork.site"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[15px] outline-none placeholder:text-white/25 focus:border-violet-400/60"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[13px] text-white/60">Mật khẩu</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 pr-12 text-[15px] outline-none placeholder:text-white/25 focus:border-violet-400/60"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute top-1/2 right-3.5 -translate-y-1/2 text-white/45"
                  >
                    {showPassword ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
                  </button>
                </div>
              </div>

              {stage.error && (
                <p className="text-[13px] leading-relaxed text-rose-300">{stage.error}</p>
              )}

              <button
                type="submit"
                disabled={busy}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-500 px-5 py-3 text-[15px] font-semibold disabled:opacity-60"
              >
                {busy && <Loader2 className="size-4 animate-spin" />}
                Đăng nhập
              </button>

              <div className="flex items-center gap-3 text-[12px] text-white/30">
                <span className="h-px flex-1 bg-white/10" />
                hoặc
                <span className="h-px flex-1 bg-white/10" />
              </div>

              <button
                type="button"
                onClick={() => void handleGoogleLogin()}
                disabled={busy}
                className="w-full rounded-xl border border-white/12 bg-white/[0.04] px-5 py-3 text-[15px] font-medium disabled:opacity-60"
              >
                Tiếp tục với Google
              </button>
            </form>
          )}
        </div>

        <p className="mt-8 text-center text-[11px] leading-relaxed text-white/30">
          Chỉ tài khoản có vai trò Support trở lên mới vào được Arex Hub.
        </p>
      </section>
    </main>
  );
}
