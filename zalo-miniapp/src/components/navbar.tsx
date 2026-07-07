import React from "react";
import { BottomNavigation, Icon, useNavigate, useLocation } from "zmp-ui";

const TABS = [
  { key: "/", label: "Trang chủ", icon: "zi-home" },
  { key: "/news", label: "Tin tức", icon: "zi-list-1" },
  { key: "/forum", label: "Diễn đàn", icon: "zi-chat" },
  { key: "/leaderboard", label: "BXH", icon: "zi-poll" },
  { key: "/account", label: "Tài khoản", icon: "zi-user" },
] as const;

// Ẩn thanh điều hướng ở màn hình đăng nhập và trang chi tiết bài viết
// (những nơi có thanh nhập liệu riêng ở dưới).
const HIDE_ON = (path: string) =>
  path === "/login" || /^\/forum\/.+/.test(path);

// Thanh điều hướng dưới cùng dùng component + icon chính chủ của Zalo UI.
export function NavBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;

  if (HIDE_ON(path)) return null;

  // Chọn tab khớp theo prefix dài nhất (vd /forum/123 → Diễn đàn).
  const active =
    [...TABS]
      .map((t) => t.key)
      .filter((k) => k === "/" ? path === "/" : path.startsWith(k))
      .sort((a, b) => b.length - a.length)[0] ?? "/";

  return (
    <BottomNavigation fixed activeKey={active} onChange={(key) => navigate(key)}>
      {TABS.map((t) => (
        <BottomNavigation.Item key={t.key} label={t.label} icon={<Icon icon={t.icon} />} />
      ))}
    </BottomNavigation>
  );
}
