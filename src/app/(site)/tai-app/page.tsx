import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Apple, Download, ShieldCheck, Smartphone, TriangleAlert } from "lucide-react";
import { getAuthContext } from "@/lib/server/auth";
import { listAppReleases, type AppPlatform } from "@/lib/server/app-releases";
import type { UserRole } from "@/lib/types/content";

/**
 * Trang tự tải app Arex Hub cho nhân viên.
 *
 * Trước đây chỉ admin vào được /admin/app rồi phải gửi file APK cho từng người.
 * Trang này mở cho mọi vai trò vào được Hub (Support trở lên) tự tải, và CI đẩy
 * bản build lên kho ngay sau khi dựng xong nên ở đây luôn là bản mới nhất.
 */
export const metadata: Metadata = {
  title: "Tải app Arex Hub",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

const STAFF_ROLES: UserRole[] = ["super_admin", "admin", "it", "manager", "support"];

const PLATFORM_META: Record<AppPlatform, { label: string; icon: typeof Smartphone; hint: string }> =
  {
    android: {
      label: "Android",
      icon: Smartphone,
      hint: "Tải file .apk về máy, mở lên rồi cho phép “Cài từ nguồn này” khi Android hỏi.",
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

export default async function TaiAppPage() {
  const auth = await getAuthContext();
  if (!auth.userId) redirect("/login?next=/tai-app");
  if (!STAFF_ROLES.includes(auth.role)) redirect("/?error=unauthorized");

  const releases = (await listAppReleases()).filter((item) => item.app === "hub");
  const [latest, ...older] = releases;

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-10">
      <header className="space-y-2">
        <h1 className="font-heading text-2xl font-black uppercase tracking-tight text-foreground">
          Tải app Arex Hub
        </h1>
        <p className="text-sm text-muted-foreground">
          App quản trị dành cho nhân viên. Bản mới nhất luôn có sẵn ở đây ngay sau khi dựng xong —
          không phải xin ai gửi file.
        </p>
      </header>

      {releases.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">Chưa có bản build nào trong kho.</p>
          <p className="mt-2 font-mono text-[11px] text-muted-foreground/70">
            Chạy workflow “Build Arex Hub Android” trên GitHub Actions.
          </p>
        </div>
      ) : (
        <>
          {/* Bản mới nhất — thứ 99% người vào đây cần. */}
          <section className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/8 to-card p-6 dark:from-amber-500/8">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-primary dark:bg-amber-400/10 dark:text-amber-400">
                Mới nhất
              </span>
              <span className="font-heading text-lg font-black text-foreground">
                {PLATFORM_META[latest.platform].label} · v{latest.version}
              </span>
            </div>

            <p className="mt-2 font-mono text-[11px] text-muted-foreground">
              {latest.fileName} · {formatSize(latest.sizeBytes)} · {formatDate(latest.updatedAt)}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {PLATFORM_META[latest.platform].hint}
            </p>

            <a
              href={`/api/hub/app/download?path=${encodeURIComponent(latest.path)}`}
              className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-black uppercase tracking-wide text-primary-foreground transition hover:opacity-90"
            >
              <Download className="size-4" />
              Tải về
            </a>
          </section>

          <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-500" />
            <div className="space-y-1 text-xs text-muted-foreground">
              <p className="font-bold text-foreground">Máy báo “ứng dụng có hại” thì sao?</p>
              <p>
                Android cảnh báo với mọi app cài ngoài CH Play, kể cả app sạch. Bản phát hành ở đây
                được ký bằng khoá riêng của Arex nên chỉ hiện thông báo “nguồn không xác định” —
                bấm “Vẫn cài” là xong. Đừng tải APK Arex Hub từ bất kỳ nguồn nào khác.
              </p>
            </div>
          </div>

          {older.length > 0 && (
            <section className="space-y-3">
              <h2 className="font-heading text-sm font-black uppercase tracking-wide text-muted-foreground">
                Bản cũ hơn
              </h2>
              {older.map((release) => (
                <div
                  key={release.path}
                  className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-foreground">
                      {PLATFORM_META[release.platform].label} · v{release.version}
                    </p>
                    <p className="truncate font-mono text-[11px] text-muted-foreground">
                      {release.fileName} · {formatSize(release.sizeBytes)} ·{" "}
                      {formatDate(release.updatedAt)}
                    </p>
                  </div>
                  <a
                    href={`/api/hub/app/download?path=${encodeURIComponent(release.path)}`}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-border px-4 py-2 text-xs font-black uppercase tracking-wide text-foreground transition hover:bg-muted"
                  >
                    <Download className="size-3.5" />
                    Tải
                  </a>
                </div>
              ))}
            </section>
          )}
        </>
      )}

      <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
        <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-500" />
        <p className="text-xs text-muted-foreground">
          Link tải là signed URL hết hạn sau 30 phút và chỉ tài khoản nhân viên mới xin được. Đừng
          chuyển link cho người ngoài.
        </p>
      </div>
    </main>
  );
}
