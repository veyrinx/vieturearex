import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  CloudOff,
  LayoutDashboard,
  LogOut,
  Newspaper,
  Plus,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";
import { Avatar, Button, Chip, Sheet, cx } from "@/components/ui";
import { useAuth } from "@/auth/auth-context";
import { ROLE_LABEL } from "@/types";
import { bindAndroidBack, haptic, openExternal } from "@/lib/native";
import { env } from "@/env";

type Tab = { to: string; label: string; icon: LucideIcon; end?: boolean };

const TABS: Tab[] = [
  { to: "/", label: "Tổng quan", icon: LayoutDashboard, end: true },
  { to: "/noi-dung", label: "Nội dung", icon: Newspaper },
  { to: "/duyet", label: "Kiểm duyệt", icon: ShieldCheck },
  { to: "/he-thong", label: "Hệ thống", icon: SlidersHorizontal },
];

const TITLES: Record<string, string> = {
  "/": "Tổng quan",
  "/noi-dung": "Nội dung",
  "/dang": "Đăng nội dung",
  "/duyet": "Kiểm duyệt",
  "/he-thong": "Hệ thống",
};

function pageTitle(pathname: string) {
  if (TITLES[pathname]) return TITLES[pathname];
  const base = `/${pathname.split("/")[1] ?? ""}`;
  return TITLES[base] ?? "Arex Hub";
}

export function AppShell({ online }: { online: boolean }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  // Nút Back của Android: ở tab gốc thì thoát app, còn lại thì lùi trang.
  useEffect(
    () =>
      bindAndroidBack(
        () => location.pathname !== "/",
        () => navigate(-1),
      ),
    [location.pathname, navigate],
  );

  // Cuộn lên đầu mỗi khi đổi trang — WebView giữ nguyên vị trí cuộn cũ.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  const composing = location.pathname.startsWith("/dang");

  return (
    <div className="min-h-dvh bg-ink-950">
      <header className="safe-top glass sticky top-0 z-40 border-b border-ink-800">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="text-[11px] font-medium tracking-[0.18em] text-mist-500 uppercase">
              Arex Hub
            </p>
            <h1 className="truncate text-[19px] leading-tight font-semibold">
              {pageTitle(location.pathname)}
            </h1>
          </div>
          <button
            type="button"
            aria-label="Tài khoản"
            onClick={() => {
              haptic("light");
              setMenuOpen(true);
            }}
            className="shrink-0"
          >
            <Avatar url={profile?.avatarUrl} name={profile?.displayName ?? "AX"} size={38} />
          </button>
        </div>

        {!online && (
          <div className="flex items-center gap-2 border-t border-warn/25 bg-warn/12 px-4 py-1.5 text-[12px] text-warn">
            <CloudOff className="size-3.5" />
            Mất kết nối — dữ liệu đang hiển thị là bản đã tải trước đó.
          </div>
        )}
      </header>

      <main className="mx-auto w-full max-w-2xl px-4 pt-4 pb-28">
        <Outlet />
      </main>

      <nav className="safe-bottom glass fixed inset-x-0 bottom-0 z-40 border-t border-ink-800">
        <div className="mx-auto grid max-w-2xl grid-cols-5 items-end px-2 pt-1.5 pb-1.5">
          {TABS.slice(0, 2).map((tab) => (
            <TabLink key={tab.to} tab={tab} />
          ))}

          <div className="flex justify-center">
            <button
              type="button"
              aria-label="Đăng nội dung"
              onClick={() => {
                haptic("medium");
                navigate("/dang");
              }}
              className={cx(
                "-mt-6 grid size-14 place-items-center rounded-2xl bg-linear-to-br from-violet-glow to-cyan-glow text-ink-950 shadow-lg shadow-violet-glow/35 transition active:scale-95",
                composing && "ring-2 ring-mist-100/70",
              )}
            >
              <Plus className="size-6" strokeWidth={2.5} />
            </button>
          </div>

          {TABS.slice(2).map((tab) => (
            <TabLink key={tab.to} tab={tab} />
          ))}
        </div>
      </nav>

      <Sheet open={menuOpen} onClose={() => setMenuOpen(false)} title="Tài khoản">
        <div className="flex items-center gap-3">
          <Avatar url={profile?.avatarUrl} name={profile?.displayName ?? "AX"} size={52} />
          <div className="min-w-0">
            <p className="truncate font-semibold">{profile?.displayName}</p>
            <p className="truncate text-[13px] text-mist-500">{profile?.email}</p>
            <Chip tone="info" className="mt-1.5">
              {ROLE_LABEL[profile?.role ?? "user"] ?? profile?.role}
            </Chip>
          </div>
        </div>

        <div className="mt-5 space-y-2">
          <Button
            variant="secondary"
            block
            icon={RefreshCw}
            onClick={() => window.location.reload()}
          >
            Tải lại dữ liệu
          </Button>
          <Button
            variant="outline"
            block
            onClick={() => void openExternal(`${env.apiBaseUrl}/admin`)}
          >
            Mở trang quản trị web
          </Button>
          <Button variant="danger" block icon={LogOut} onClick={() => void signOut()}>
            Đăng xuất
          </Button>
        </div>

        <p className="mt-4 text-center text-[11px] text-mist-500">
          Arex Hub v{env.appVersion} · {env.apiBaseUrl.replace(/^https?:\/\//, "")}
        </p>
      </Sheet>
    </div>
  );
}

function TabLink({ tab }: { tab: Tab }) {
  const Icon = tab.icon;
  return (
    <NavLink
      to={tab.to}
      end={tab.end}
      onClick={() => haptic("light")}
      className={({ isActive }) =>
        cx(
          "flex flex-col items-center gap-1 rounded-xl py-1.5 text-[10.5px] font-medium transition",
          isActive ? "text-cyan-glow" : "text-mist-500",
        )
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={cx(
              "grid size-8 place-items-center rounded-xl transition",
              isActive && "bg-cyan-glow/12",
            )}
          >
            <Icon className="size-[18px]" />
          </span>
          {tab.label}
        </>
      )}
    </NavLink>
  );
}
