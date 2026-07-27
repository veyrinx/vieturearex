import Link from "next/link";
import { Home, Newspaper, MessageSquare, Trophy, Search } from "lucide-react";

const NAV_LINKS = [
  { href: "/",          icon: Home,          label: "Trang chủ" },
  { href: "/news",      icon: Newspaper,     label: "Tin tức" },
  { href: "/community", icon: MessageSquare, label: "Diễn đàn" },
  { href: "/tournaments",icon: Trophy,       label: "Giải đấu" },
  { href: "/search",    icon: Search,        label: "Tìm kiếm" },
];

export default function NotFoundPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      {/* Background glows */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/4 top-1/4 size-[500px] rounded-full bg-primary/8 blur-[120px] dark:bg-amber-400/6" />
        <div className="absolute right-1/4 bottom-1/4 size-[400px] rounded-full bg-violet-500/6 blur-[100px]" />
      </div>

      <div className="w-full max-w-lg space-y-8 text-center">
        {/* 404 text */}
        <div className="relative">
          <p
            className="font-heading text-[10rem] font-black leading-none tracking-tighter text-foreground/[0.07] dark:text-foreground/[0.06] select-none md:text-[14rem]"
            aria-hidden
          >
            404
          </p>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <div className="flex size-16 items-center justify-center rounded-2xl border border-border bg-card shadow-lg">
              <span className="text-3xl">🔍</span>
            </div>
            <div>
              <h1 className="font-heading text-2xl font-black uppercase tracking-tight text-foreground">
                Trang không tồn tại
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Trang bạn tìm kiếm đã bị xóa, di chuyển hoặc chưa từng tồn tại.
              </p>
            </div>
          </div>
        </div>

        {/* Navigation links */}
        <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground">
            Có thể bạn đang tìm
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {NAV_LINKS.map(({ href, icon: Icon, label }) => (
              <Link
                key={href}
                href={href}
                className="group flex flex-col items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-3 transition-all hover:border-primary/40 hover:bg-muted hover:-translate-y-0.5 hover:shadow-sm"
              >
                <Icon className="size-4 text-muted-foreground transition-colors group-hover:text-primary dark:group-hover:text-amber-400" />
                <span className="text-[11px] font-semibold text-muted-foreground group-hover:text-foreground transition-colors">{label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Back button */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground transition-all hover:opacity-90 hover:shadow-lg hover:shadow-primary/25"
        >
          <Home className="size-4" />
          Về trang chủ
        </Link>
      </div>
    </main>
  );
}
