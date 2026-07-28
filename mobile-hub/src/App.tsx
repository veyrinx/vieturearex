import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { BrandMark } from "@/components/brand-mark";
import { Button, Spinner } from "@/components/ui";
import { useAuth } from "@/auth/auth-context";
import { bootNativeChrome, registerPush, watchNetwork } from "@/lib/native";
import { startNotificationPolling } from "@/lib/notify";
import { ROLE_LABEL } from "@/types";
import { LoginScreen } from "@/screens/login";
import { DashboardScreen } from "@/screens/dashboard";
import { ComposeScreen } from "@/screens/compose";
import { ContentScreen } from "@/screens/content";
import { ModerationScreen } from "@/screens/moderation";
import { SystemScreen } from "@/screens/system";
import { UsersScreen } from "@/screens/system-users";
import { BroadcastScreen } from "@/screens/system-broadcast";
import { ReleasesScreen } from "@/screens/system-releases";
import { LogsScreen } from "@/screens/system-logs";

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

  // Chưa có FCM nên thông báo chạy bằng cách tự hỏi server theo chu kỳ.
  useEffect(() => {
    if (!session || !profile || forbidden) return;
    return startNotificationPolling((url) => {
      // entity_url là đường dẫn của website; Hub có bộ route riêng nên chỉ
      // nhận những đường trong app, còn lại đưa về màn hình chính.
      navigate(url.startsWith("/") ? url : "/");
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
      <Route element={<AppShell online={online} />}>
        <Route index element={<DashboardScreen />} />
        <Route path="/dang" element={<ComposeScreen />} />
        <Route path="/noi-dung" element={<ContentScreen />} />
        <Route path="/duyet" element={<ModerationScreen />} />
        <Route path="/he-thong" element={<SystemScreen />} />
        <Route path="/he-thong/nguoi-dung" element={<UsersScreen />} />
        <Route path="/he-thong/thong-bao" element={<BroadcastScreen />} />
        <Route path="/he-thong/ban-phat-hanh" element={<ReleasesScreen />} />
        <Route path="/he-thong/nhat-ky" element={<LogsScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
