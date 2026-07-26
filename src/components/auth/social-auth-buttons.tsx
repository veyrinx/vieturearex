"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Provider = "google" | "facebook";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px]" aria-hidden="true">
      <path fill="#4285F4" d="M23.52 12.27c0-.86-.08-1.69-.22-2.48H12v4.7h6.46a5.53 5.53 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.84Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.08 7.94-2.9l-3.88-3c-1.08.72-2.45 1.15-4.06 1.15-3.13 0-5.78-2.11-6.72-4.95H1.27v3.09A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.28 14.3a7.2 7.2 0 0 1 0-4.6V6.61H1.27a12 12 0 0 0 0 10.78l4.01-3.09Z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.27 6.61l4.01 3.09C6.22 6.86 8.87 4.75 12 4.75Z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px]" aria-hidden="true">
      <path
        fill="#1877F2"
        d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.96h-1.51c-1.49 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07Z"
      />
    </svg>
  );
}

const LABELS: Record<Provider, string> = {
  google: "Google",
  facebook: "Facebook",
};

/**
 * Nút đăng nhập/đăng ký bằng Google & Facebook cho trang công khai.
 * Callback riêng (/auth/oauth-callback) — không dùng chung với luồng quản trị.
 */
export function SocialAuthButtons({ className }: { className?: string }) {
  const [pending, setPending] = useState<Provider | null>(null);

  const signIn = async (provider: Provider) => {
    const supabase = createClient();
    if (!supabase) {
      toast.error("Hệ thống xác thực chưa sẵn sàng. Vui lòng thử lại sau.");
      return;
    }

    setPending(provider);
    const next = new URLSearchParams(window.location.search).get("next") ?? "/";
    const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";
    const redirectTo = `${window.location.origin}/auth/oauth-callback?next=${encodeURIComponent(safeNext)}`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    });

    if (error) {
      setPending(null);
      toast.error(`Không thể đăng nhập bằng ${LABELS[provider]}. Vui lòng thử lại.`);
    }
    // Thành công: trình duyệt chuyển sang trang provider, giữ nguyên trạng thái loading.
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-border/60" />
        <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70">
          Hoặc tiếp tục với
        </span>
        <span className="h-px flex-1 bg-border/60" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {(["google", "facebook"] as Provider[]).map((provider) => (
          <button
            key={provider}
            type="button"
            onClick={() => signIn(provider)}
            disabled={pending !== null}
            className="flex h-12 items-center justify-center gap-2.5 rounded-xl border border-border/60 bg-background/60 text-sm font-semibold text-foreground transition-all hover:-translate-y-0.5 hover:border-primary/35 hover:bg-secondary/60 disabled:pointer-events-none disabled:opacity-60"
          >
            {provider === "google" ? <GoogleIcon /> : <FacebookIcon />}
            {pending === provider ? "Đang chuyển..." : LABELS[provider]}
          </button>
        ))}
      </div>
    </div>
  );
}
