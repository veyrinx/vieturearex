import { UserPlus, Download, BadgeCheck } from "lucide-react";
import { getUsers } from "@/lib/data/content-service";

const ROLE_META: Record<string, { label: string; cls: string }> = {
  it:          { label: "IT",         cls: "bg-violet-500/10 text-violet-500" },
  super_admin: { label: "Super",      cls: "bg-red-500/10 text-red-500" },
  admin:       { label: "Admin",      cls: "bg-amber-500/10 text-amber-500" },
  manager:     { label: "Quản lý",    cls: "bg-blue-500/10 text-blue-500" },
  support:     { label: "CSKH",       cls: "bg-green-500/10 text-green-500" },
  user:        { label: "Người dùng", cls: "bg-muted text-muted-foreground" },
};

function fmtDate(s: string) {
  try { return new Date(s).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }); }
  catch { return s; }
}

export async function RegistrationReportCard() {
  const users = await getUsers().catch(() => []);
  const sorted = [...users].sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
  const recent = sorted.slice(0, 8);

  const now = Date.now();
  const DAY = 24 * 3600 * 1000;
  const within = (s: string | undefined, ms: number) => !!s && now - new Date(s).getTime() < ms;
  const newToday = users.filter((u) => within(u.created_at, DAY)).length;
  const new7 = users.filter((u) => within(u.created_at, 7 * DAY)).length;
  const totalViews = users.reduce((acc, u) => acc + (u.views ?? 0), 0);

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-xl bg-blue-500/10">
            <UserPlus className="size-4 text-blue-500" />
          </span>
          <div>
            <h2 className="text-sm font-black uppercase tracking-widest text-foreground">Báo cáo đăng ký</h2>
            <p className="text-[11px] text-muted-foreground">Ai đăng ký · tên · lượt xem</p>
          </div>
        </div>
        <a
          href="/api/admin/report/export"
          download
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground transition hover:opacity-90 dark:bg-amber-500 dark:text-background"
        >
          <Download className="size-3.5" /> Xuất CSV
        </a>
      </div>

      {/* Mini stats */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: "Tổng tài khoản", value: users.length.toLocaleString("vi-VN") },
          { label: "Đăng ký hôm nay", value: newToday.toLocaleString("vi-VN") },
          { label: "7 ngày qua", value: new7.toLocaleString("vi-VN") },
          { label: "Tổng lượt xem", value: totalViews.toLocaleString("vi-VN") },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-muted/30 px-3 py-2">
            <p className="font-heading text-lg font-black text-foreground tabular-nums">{s.value}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Recent registrations */}
      {recent.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-xs">
            <thead>
              <tr className="border-b border-border text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <th className="py-2 pr-2 font-bold">#</th>
                <th className="py-2 pr-2 font-bold">Tên</th>
                <th className="py-2 pr-2 font-bold">Email</th>
                <th className="py-2 pr-2 font-bold">Vai trò</th>
                <th className="py-2 pr-2 font-bold">Ngày</th>
                <th className="py-2 pr-2 text-right font-bold">Views</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((u, i) => {
                const role = ROLE_META[u.role] ?? ROLE_META.user;
                const name = u.display_name || u.email?.split("@")[0] || "—";
                return (
                  <tr key={u.id} className="border-b border-border/50 last:border-0">
                    <td className="py-2 pr-2 text-muted-foreground tabular-nums">{i + 1}</td>
                    <td className="py-2 pr-2">
                      <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                        {name}
                        {u.is_verified && <BadgeCheck className="size-3 text-sky-500" />}
                      </span>
                    </td>
                    <td className="max-w-[180px] truncate py-2 pr-2 font-mono text-[11px] text-muted-foreground">{u.email}</td>
                    <td className="py-2 pr-2">
                      <span className={`inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-bold ${role.cls}`}>{role.label}</span>
                    </td>
                    <td className="py-2 pr-2 text-muted-foreground">{u.created_at ? fmtDate(u.created_at) : "—"}</td>
                    <td className="py-2 pr-2 text-right tabular-nums text-foreground">{(u.views ?? 0).toLocaleString("vi-VN")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="py-6 text-center text-xs text-muted-foreground">Chưa có dữ liệu đăng ký.</p>
      )}
    </div>
  );
}
