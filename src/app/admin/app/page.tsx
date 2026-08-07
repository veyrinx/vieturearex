import type { Metadata } from "next";
import { Apple, Download, Smartphone, TriangleAlert } from "lucide-react";
import { requireAdminAccess } from "@/lib/server/auth";
import { listAppReleases, type AppPlatform } from "@/lib/server/app-releases";

export const metadata: Metadata = { title: "Tải app" };
export const dynamic = "force-dynamic";

const PLATFORM_META: Record<AppPlatform, { label: string; icon: typeof Smartphone; hint: string }> = {
  android: {
    label: "Android",
    icon: Smartphone,
    hint: "Bản debug đã tự ký — chép sang máy, bật “Cài từ nguồn không xác định” rồi mở file.",
  },
  ios: {
    label: "iOS",
    icon: Apple,
    hint: "IPA chưa ký — phải qua Sideloadly/AltStore ký lại bằng Apple ID, app sống 7 ngày.",
  },
};

function formatSize(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminAppDownloadPage() {
  // Layout cũng gọi requireAdminAccess, nhưng layout và page render SONG SONG:
  // redirect ở layout không ngăn page chạy, nên RSC payload vẫn kèm dữ liệu.
  // Phải chặn ngay tại page thì danh sách build mới không lộ ra ngoài.
  await requireAdminAccess();

  const releases = await listAppReleases();

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/8 to-card p-6 dark:from-amber-500/8">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 dark:bg-amber-400/10">
            <Download className="size-5 text-primary dark:text-amber-400" />
          </span>
          <div>
            <h1 className="font-heading text-xl font-black uppercase tracking-tight text-foreground">Tải app</h1>
            <p className="font-mono text-[11px] text-muted-foreground">
              Bản cài đặt iOS / Android · chỉ admin thấy được
            </p>
          </div>
        </div>
      </div>

      {/* Cảnh báo nội bộ */}
      <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
        <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-500" />
        <div className="space-y-1 text-xs text-muted-foreground">
          <p className="font-bold text-foreground">Chưa công khai</p>
          <p>
            Link tải là signed URL hết hạn sau 30 phút và chỉ tài khoản admin mới gọi được.
            Người dùng thường không nhìn thấy trang này, cũng không đoán được đường dẫn file.
          </p>
        </div>
      </div>

      {/* Danh sách bản build */}
      {releases.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">Chưa có bản build nào trong kho.</p>
          <p className="mt-2 font-mono text-[11px] text-muted-foreground/70">
            node scripts/upload-app-release.mjs &lt;file&gt; --version 1.0.0
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {releases.map((release) => {
            const meta = PLATFORM_META[release.platform];
            const Icon = meta.icon;

            return (
              <div
                key={release.path}
                className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-center"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-muted">
                  <Icon className="size-5 text-foreground" />
                </span>

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-heading text-base font-black text-foreground">{meta.label}</h2>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-primary dark:bg-amber-400/10 dark:text-amber-400">
                      v{release.version}
                    </span>
                  </div>
                  <p className="truncate font-mono text-[11px] text-muted-foreground">
                    {release.fileName} · {formatSize(release.sizeBytes)} · {formatDate(release.updatedAt)}
                  </p>
                  <p className="text-xs text-muted-foreground">{meta.hint}</p>
                </div>

                <a
                  href={`/api/admin/app-releases/download?path=${encodeURIComponent(release.path)}`}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-black uppercase tracking-wide text-primary-foreground transition hover:opacity-90"
                >
                  <Download className="size-3.5" />
                  Tải về
                </a>
              </div>
            );
          })}
        </div>
      )}

      {/* Hướng dẫn thêm bản mới */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-2 font-heading text-sm font-black uppercase tracking-wide text-foreground">
          Thêm bản build mới
        </h2>
        <p className="mb-2 text-xs text-muted-foreground">
          <strong className="text-foreground">Arex Hub tự phát hành:</strong> workflow “Build Arex
          Hub Android” đẩy thẳng APK lên kho sau khi build xong, nhân viên tự tải ở{" "}
          <code className="font-mono text-[11px]">/tai-app</code> — không phải gửi file cho ai.
        </p>
        <p className="mb-2 text-xs text-muted-foreground">Các app còn lại vẫn đẩy tay:</p>
        <ol className="list-inside list-decimal space-y-1.5 text-xs text-muted-foreground">
          <li>Chạy workflow “Build app Android” / “Build app iOS” trên GitHub Actions.</li>
          <li>Tải artifact về máy (<code className="font-mono">arex-android</code> / <code className="font-mono">arex-ios-unsigned</code>).</li>
          <li>
            Đẩy lên kho:{" "}
            <code className="font-mono text-[11px]">node scripts/upload-app-release.mjs &lt;file&gt; --version 1.0.1</code>
          </li>
        </ol>
      </div>
    </section>
  );
}
