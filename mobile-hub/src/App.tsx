import { lazy, useEffect, useState, type ComponentType } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { BrandMark } from "@/components/brand-mark";
import { Button, Spinner } from "@/components/ui";
import { useAuth } from "@/auth/auth-context";
import { bootNativeChrome, onPushOpened, registerPush, watchNetwork } from "@/lib/native";
import { startNotificationPolling } from "@/lib/notify";
import { ROLE_LABEL } from "@/types";
import { ADMIN_ROUTES } from "@/admin/registry";
import { LoginScreen } from "@/screens/login";
import { DashboardScreen } from "@/screens/dashboard";

/**
 * Chia nhỏ bundle theo màn hình.
 *
 * Đăng nhập và Bảng điều khiển nạp sẵn vì luôn là thứ hiện đầu tiên; các màn
 * còn lại tải khi bấm tới, nên lần mở app không phải nuốt cả cục JS. Các file
 * này xuất theo tên nên phải ánh xạ sang `default` cho `lazy()`.
 */
const lazyScreen = <T extends string>(load: () => Promise<Record<T, ComponentType>>, name: T) =>
  lazy(() => load().then((module) => ({ default: module[name] })));

const ComposeScreen = lazyScreen(() => import("@/screens/compose"), "ComposeScreen");
const ContentScreen = lazyScreen(() => import("@/screens/content"), "ContentScreen");
const ModerationScreen = lazyScreen(() => import("@/screens/moderation"), "ModerationScreen");
const ShopScreen = lazyScreen(() => import("@/screens/shop"), "ShopScreen");
const NotificationsScreen = lazyScreen(
  () => import("@/screens/notifications"),
  "NotificationsScreen",
);
const SystemScreen = lazyScreen(() => import("@/screens/system"), "SystemScreen");
const UsersScreen = lazyScreen(() => import("@/screens/system-users"), "UsersScreen");
const BroadcastScreen = lazyScreen(() => import("@/screens/system-broadcast"), "BroadcastScreen");
const ReleasesScreen = lazyScreen(() => import("@/screens/system-releases"), "ReleasesScreen");
const UpdateScreen = lazyScreen(() => import("@/screens/system-update"), "UpdateScreen");
const SettingsScreen = lazyScreen(() => import("@/screens/system-settings"), "SettingsScreen");
const LogsScreen = lazyScreen(() => import("@/screens/system-logs"), "LogsScreen");

export function App() {
  const { loading, session, profile, forbidden, signOut } = useAuth();
  const [online, setOnline] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    void bootNativeChrome();
    return watchNetwork(setOnline);
  }, []);

  // Chỉ xin quyền thông báo sau khi đã vào được Hub — tránh hỏi ngay màn đăng nhập.
  useEffect(() => {
    if (session && profile && !forbidden) void registerPush();
  }, [session, profile, forbidden]);

  // Chạm vào thông báo đẩy → mở hộp thông báo trong app.
  useEffect(() => {
    if (!session || !profile || forbidden) return;
    return onPushOpened(() => navigate("/thong-bao"));
  }, [session, profile, forbidden, navigate]);

  // Chưa có FCM nên thông báo chạy bằng cách tự hỏi server theo chu kỳ.
  useEffect(() => {
    if (!session || !profile || forbidden) return;
    return startNotificationPolling(() => {
      // entity_url là đường dẫn của website, Hub có bộ route riêng nên đi thẳng
      // sẽ rơi vào catch-all. Đưa về hộp thông báo: ở đó bấm vào từng mục sẽ
      // được dẫn đúng chỗ (màn trong app, hoặc mở web).
      navigate("/thong-bao");
    });
  }, [session, profile, forbidden, navigate]);

  if (loading) {
    return (
      <div className="grid min-h-dvh place-items-center bg-ink-950">
        <div className="flex flex-col items-center gap-3">
          <BrandMark />
          <Spinner />
        </div>
      </div>
    );
  }

  if (!session) return <LoginScreen />;

  if (forbidden) {
    return (
      <div className="grid min-h-dvh place-items-center bg-ink-950 px-8 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="grid size-14 place-items-center rounded-2xl bg-danger/12 text-danger">
            <ShieldAlert className="size-6" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Tài khoản không có quyền</h1>
            <p className="mt-1.5 text-[13px] leading-relaxed text-mist-500">
              {profile?.isBanned
                ? "Tài khoản này đang bị khoá."
                : `Arex Hub chỉ dành cho quản trị viên. Vai trò hiện tại: ${
                    ROLE_LABEL[profile?.role ?? "user"] ?? profile?.role
                  }.`}
            </p>
          </div>
          <Button variant="outline" onClick={() => void signOut()}>
            Đăng nhập tài khoản khác
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Suspense đặt TRONG AppShell để thanh dưới + header đứng yên khi
          chuyển màn, chỉ phần nội dung nhấp nháy lúc tải chunk. */}
      <Route element={<AppShell online={online} />}>
        <Route index element={<DashboardScreen />} />
        <Route path="/dang" element={<ComposeScreen />} />
        <Route path="/noi-dung" element={<ContentScreen />} />
        <Route path="/duyet" element={<ModerationScreen />} />
        <Route path="/cho" element={<ShopScreen />} />
        <Route path="/thong-bao" element={<NotificationsScreen />} />
        <Route path="/he-thong" element={<SystemScreen />} />
        <Route path="/he-thong/nguoi-dung" element={<UsersScreen />} />
        <Route path="/he-thong/thong-bao" element={<BroadcastScreen />} />
        <Route path="/he-thong/ban-phat-hanh" element={<ReleasesScreen />} />
        <Route path="/he-thong/cap-nhat" element={<UpdateScreen />} />
        <Route path="/he-thong/cai-dat" element={<SettingsScreen />} />
        <Route path="/he-thong/nhat-ky" element={<LogsScreen />} />

        {/* Các mục quản trị còn lại khai ở admin/registry.tsx — thêm mục mới
            chỉ cần thêm một dòng ở đó, không phải sửa file này. */}
        {ADMIN_ROUTES.map((entry) => {
          const Screen = entry.component;
          return <Route key={entry.id} path={entry.path} element={<Screen />} />;
        })}

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
