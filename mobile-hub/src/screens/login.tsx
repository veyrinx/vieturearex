import { useState, type FormEvent } from "react";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { Button, Field, Input } from "@/components/ui";
import { errorMessage, useToast } from "@/components/toast";
import { useAuth } from "@/auth/auth-context";
import { openExternal } from "@/lib/native";
import { env } from "@/env";

export function LoginScreen() {
  const { signIn } = useAuth();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!email.trim() || !password) {
      setError("Nhập đủ email và mật khẩu.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await signIn(email, password);
      toast.success("Đăng nhập thành công.");
    } catch (err) {
      const message = errorMessage(err);
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="safe-top safe-bottom flex min-h-dvh flex-col justify-center bg-ink-950 px-6">
      {/* Vệt sáng nền cho đỡ phẳng, không chắn thao tác. */}
      <div
        aria-hidden
        className="pointer-events-none fixed -top-32 left-1/2 size-[420px] -translate-x-1/2 rounded-full bg-violet-glow/18 blur-[110px]"
      />

      <div className="animate-in-up relative mx-auto w-full max-w-sm">
        <div className="flex flex-col items-center text-center">
          <BrandMark />
          <h1 className="mt-4 text-2xl font-semibold">Arex Hub</h1>
          <p className="mt-1.5 text-[13px] text-mist-500">
            Bảng điều khiển quản trị web &amp; app Arex Network
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <Field label="Email" required>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@arexnetwork.site"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              inputMode="email"
              enterKeyHint="next"
            />
          </Field>

          <Field label="Mật khẩu" required error={error ?? undefined}>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                enterKeyHint="go"
                className="pr-12"
              />
              <button
                type="button"
                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute top-1/2 right-3.5 -translate-y-1/2 text-mist-500"
              >
                {showPassword ? <EyeOff className="size-4.5" /> : <Eye className="size-4.5" />}
              </button>
            </div>
          </Field>

          <Button type="submit" size="lg" block icon={LogIn} loading={submitting}>
            Đăng nhập
          </Button>
        </form>

        <button
          type="button"
          onClick={() => void openExternal(`${env.apiBaseUrl}/auth/forgot-password`)}
          className="mt-5 block w-full text-center text-[13px] text-mist-500"
        >
          Quên mật khẩu?
        </button>

        <p className="mt-8 text-center text-[11px] leading-relaxed text-mist-500/80">
          Chỉ tài khoản có vai trò Support trở lên mới vào được Hub.
          <br />
          v{env.appVersion} · {env.apiBaseUrl.replace(/^https?:\/\//, "")}
        </p>
      </div>
    </div>
  );
}
