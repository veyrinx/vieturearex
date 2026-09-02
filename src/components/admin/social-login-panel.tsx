"use client";

import { useEffect, useState } from "react";
import {
  Check, Copy, ExternalLink, Loader2, LogIn, ShieldAlert, ShieldCheck, Save,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  SOCIAL_PROVIDERS,
  SOCIAL_PROVIDER_CONSOLE,
  SOCIAL_PROVIDER_LABEL,
  type SocialProvider,
} from "@/lib/constants/social-login";

type Data = {
  live: Record<SocialProvider, boolean>;
  shown: SocialProvider[];
  clientIds: Partial<Record<SocialProvider, string>>;
  canManage: boolean;
  callbackUrl: string;
};

type Draft = { clientId: string; secret: string; enabled: boolean; shown: boolean };

function CopyRow({ value, label }: { value: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-lg border border-border bg-secondary/40 px-3 py-2 text-xs">
          {value}
        </code>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            navigator.clipboard.writeText(value).then(
              () => { setDone(true); setTimeout(() => setDone(false), 1500); },
              () => toast.error("Không copy được."),
            );
          }}
        >
          {done ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        </Button>
      </div>
    </div>
  );
}

/**
 * Bật đăng nhập Google / Facebook / Discord ngay trong admin.
 *
 * Chia rõ hai việc vì chúng nằm ở hai nơi khác nhau: provider có CHẠY hay
 * không là cấu hình của dự án Supabase, còn nút có HIỆN ở trang đăng nhập hay
 * không là settings của site. Trước đợt này nút Google/Facebook nằm sẵn ở
 * /login trong khi bên Supabase chưa bật provider nào — bấm vào là lỗi.
 */
export function SocialLoginPanel() {
  const [data, setData] = useState<Data | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [saving, setSaving] = useState<SocialProvider | null>(null);

  const load = async () => {
    try {
      const res = await fetch("/api/admin/social-login");
      if (!res.ok) throw new Error("failed");
      const d = (await res.json()) as Data;
      setData(d);
      setDrafts(
        Object.fromEntries(
          SOCIAL_PROVIDERS.map((p) => [
            p,
            {
              clientId: d.clientIds[p] ?? "",
              secret: "",
              enabled: d.live[p],
              shown: d.shown.includes(p),
            },
          ]),
        ),
      );
    } catch {
      toast.error("Không tải được cấu hình đăng nhập.");
    }
  };

  useEffect(() => { void load(); }, []);

  const save = async (provider: SocialProvider) => {
    const draft = drafts[provider];
    if (!draft) return;
    setSaving(provider);
    try {
      const res = await fetch("/api/admin/social-login", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          enabled: draft.enabled,
          shown: draft.shown,
          clientId: draft.clientId.trim() || undefined,
          secret: draft.secret.trim() || undefined,
        }),
      });
      const d = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (res.ok && d.ok) {
        toast.success(`Đã lưu ${SOCIAL_PROVIDER_LABEL[provider]}.`);
        await load();
      } else {
        toast.error(d.error ?? "Lưu thất bại.");
      }
    } catch {
      toast.error("Lỗi kết nối.");
    } finally {
      setSaving(null);
    }
  };

  if (!data) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="mr-2 size-4 animate-spin" /> Đang tải…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Card className="space-y-4 p-5">
        <div className="flex items-start gap-3">
          <LogIn className="mt-0.5 size-5 shrink-0 text-primary dark:text-amber-400" />
          <div className="space-y-1">
            <h2 className="font-heading text-lg font-black uppercase tracking-tight">Đăng nhập mạng xã hội</h2>
            <p className="text-sm text-muted-foreground">
              Khai ứng dụng OAuth bên console của Google/Facebook/Discord, dán Client ID + Secret vào đây.
              Dán đúng URL bên dưới vào ô <em>Authorized redirect URI</em> của cả ba.
            </p>
          </div>
        </div>

        <CopyRow label="Redirect URI (dán vào console của provider)" value={data.callbackUrl} />

        {!data.canManage && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
            <ShieldAlert className="mt-0.5 size-4 shrink-0" />
            <p>
              Chưa có <code className="font-mono">SUPABASE_ACCESS_TOKEN</code> nên trang này chưa bật/tắt
              provider hộ được — bật tay ở Supabase Dashboard → Authentication → Providers, rồi quay lại
              đây bật nút hiển thị. Thêm Personal Access Token (<code className="font-mono">sbp_…</code>)
              vào biến môi trường là bật thẳng từ đây.
            </p>
          </div>
        )}
      </Card>

      {SOCIAL_PROVIDERS.map((provider) => {
        const draft = drafts[provider];
        if (!draft) return null;
        const consoleInfo = SOCIAL_PROVIDER_CONSOLE[provider];
        const liveOn = data.live[provider];

        return (
          <Card key={provider} className="space-y-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h3 className="font-heading text-base font-black uppercase tracking-tight">
                  {SOCIAL_PROVIDER_LABEL[provider]}
                </h3>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${
                    liveOn
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {liveOn ? <ShieldCheck className="size-3" /> : <ShieldAlert className="size-3" />}
                  {liveOn ? "Đang chạy" : "Chưa bật"}
                </span>
              </div>
              <a
                href={consoleInfo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline dark:text-amber-400"
              >
                {consoleInfo.name} <ExternalLink className="size-3" />
              </a>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                  Client ID
                </label>
                <Input
                  value={draft.clientId}
                  onChange={(e) => setDrafts((d) => ({ ...d, [provider]: { ...draft, clientId: e.target.value } }))}
                  placeholder={data.canManage ? "Dán Client ID" : "Cần SUPABASE_ACCESS_TOKEN mới sửa được"}
                  disabled={!data.canManage}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                  Client Secret
                </label>
                <Input
                  type="password"
                  value={draft.secret}
                  onChange={(e) => setDrafts((d) => ({ ...d, [provider]: { ...draft, secret: e.target.value } }))}
                  placeholder={data.canManage ? "Bỏ trống = giữ secret cũ" : "Cần SUPABASE_ACCESS_TOKEN mới sửa được"}
                  disabled={!data.canManage}
                />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Secret đi thẳng sang Supabase, không lưu lại trong cơ sở dữ liệu của site.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={draft.enabled}
                  disabled={!data.canManage}
                  onChange={(e) => setDrafts((d) => ({ ...d, [provider]: { ...draft, enabled: e.target.checked } }))}
                  className="size-4 accent-primary"
                />
                Bật luồng đăng nhập (Supabase)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={draft.shown}
                  onChange={(e) => setDrafts((d) => ({ ...d, [provider]: { ...draft, shown: e.target.checked } }))}
                  className="size-4 accent-primary"
                />
                Hiện nút ở trang đăng nhập
              </label>

              <Button
                type="button"
                size="sm"
                className="ml-auto"
                onClick={() => save(provider)}
                disabled={saving !== null}
              >
                {saving === provider
                  ? <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                  : <Save className="mr-1.5 size-3.5" />}
                Lưu
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
