"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { isNativeApp, openExternal } from "@/lib/native/bridge";
import {
  SOCIAL_PROVIDER_LABEL,
  isSocialProvider,
  type SocialProvider,
} from "@/lib/constants/social-login";

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

function DiscordIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px]" aria-hidden="true">
      <path
        fill="#5865F2"
        d="M20.32 4.37A19.8 19.8 0 0 0 15.43 2.9a.07.07 0 0 0-.08.04c-.21.38-.44.87-.61 1.25a18.3 18.3 0 0 0-5.48 0 12.6 12.6 0 0 0-.62-1.25.08.08 0 0 0-.08-.04c-1.71.3-3.35.8-4.89 1.47a.07.07 0 0 0-.03.03C.53 9.05-.32 13.58.1 18.06c0 .02.02.04.04.06a19.9 19.9 0 0 0 6 3.03.08.08 0 0 0 .08-.03c.46-.63.87-1.3 1.22-2a.08.08 0 0 0-.04-.11c-.65-.25-1.27-.55-1.87-.9a.08.08 0 0 1 0-.13l.37-.29a.07.07 0 0 1 .08 0 14.2 14.2 0 0 0 12.06 0 .07.07 0 0 1 .08 0l.37.3a.08.08 0 0 1 0 .12c-.6.35-1.22.65-1.87.9a.08.08 0 0 0-.04.11c.36.7.77 1.36 1.22 2a.08.08 0 0 0 .08.03 19.8 19.8 0 0 0 6.01-3.03.08.08 0 0 0 .04-.06c.5-5.18-.84-9.67-3.55-13.66a.06.06 0 0 0-.03-.03ZM8.02 15.33c-1.18 0-2.16-1.08-2.16-2.42 0-1.33.96-2.42 2.16-2.42 1.21 0 2.18 1.1 2.16 2.42 0 1.34-.96 2.42-2.16 2.42Zm7.97 0c-1.18 0-2.16-1.08-2.16-2.42 0-1.33.96-2.42 2.16-2.42 1.21 0 2.18 1.1 2.16 2.42 0 1.34-.95 2.42-2.16 2.42Z"
      />
    </svg>
  );
}

const ICONS: Record<SocialProvider, () => React.JSX.Element> = {
  google: GoogleIcon,
  facebook: FacebookIcon,
  discord: DiscordIcon,
};

/**
 * Nút đăng nhập/đăng ký bằng mạng xã hội cho trang công khai.
 * Callback riêng (/auth/oauth-callback) — không dùng chung với luồng quản trị.
 *
 * Danh sách nút do /admin/social-login quyết định, KHÔNG viết cứng nữa: trước
 * đây Google + Facebook luôn nằm đó trong khi bên Supabase chưa bật provider
 * nào, ai bấm cũng chỉ nhận được một dòng báo lỗi.
 */
export function SocialAuthButtons({ className }: { className?: string }) {
  const [providers, setProviders] = useState<SocialProvider[]>([]);
  const [pending, setPending] = useState<SocialProvider | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/auth/providers")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { providers?: string[] } | null) => {
        if (!alive || !d?.providers) return;
        setProviders(d.providers.filter(isSocialProvider));
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const signIn = async (provider: SocialProvider) => {
    const supabase = createClient();
    if (!supabase) {
      toast.error("Hệ thống xác thực chưa sẵn sàng. Vui lòng thử lại sau.");
      return;
    }

    setPending(provider);
    const next = new URLSearchParams(window.location.search).get("next") ?? "/";
    const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";

    // App native: Google chặn OAuth trong WebView → mở bằng trình duyệt hệ
    // thống rồi quay lại app qua /auth/native-bridge → arex://auth/callback.
    const native = isNativeApp();
    const callbackPath = native ? "/auth/native-bridge" : "/auth/oauth-callback";
    const redirectTo = `${window.location.origin}${callbackPath}?next=${encodeURIComponent(safeNext)}`;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo, skipBrowserRedirect: native },
    });

    if (error) {
      setPending(null);
      toast.error(`Không thể đăng nhập bằng ${SOCIAL_PROVIDER_LABEL[provider]}. Vui lòng thử lại.`);
      return;
    }

    if (native) {
      if (!data?.url) {
        setPending(null);
        toast.error("Không mở được trang đăng nhập. Vui lòng thử lại.");
        return;
      }
      await openExternal(data.url);
      // Người dùng có thể huỷ và quay lại app → mở khoá nút sau ít giây.
      setTimeout(() => setPending(null), 3000);
      return;
    }
    // Web: trình duyệt chuyển sang trang provider, giữ nguyên trạng thái loading.
  };

  // Chưa bật provider nào thì không vẽ cả cái vạch "Hoặc tiếp tục với".
  if (providers.length === 0) return null;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-border/60" />
        <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70">
          Hoặc tiếp tục với
        </span>
        <span className="h-px flex-1 bg-border/60" />
      </div>

      <div className={cn("grid gap-3", providers.length === 1 ? "grid-cols-1" : "grid-cols-2")}>
        {providers.map((provider) => {
          const Icon = ICONS[provider];
          return (
            <button
              key={provider}
              type="button"
              onClick={() => signIn(provider)}
              disabled={pending !== null}
              className="flex h-12 items-center justify-center gap-2.5 rounded-xl border border-border/60 bg-background/60 text-sm font-semibold text-foreground transition-all hover:-translate-y-0.5 hover:border-primary/35 hover:bg-secondary/60 disabled:pointer-events-none disabled:opacity-60"
            >
              <Icon />
              {pending === provider ? "Đang chuyển..." : SOCIAL_PROVIDER_LABEL[provider]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
