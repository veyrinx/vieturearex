import React, { useEffect, useState } from "react";
import { BottomNavigation, Icon, useNavigate, useLocation } from "zmp-ui";
import { useAuth } from "../hooks/useAuth";
import { fetchUnreadCount } from "../api";

const TABS = [
  { key: "/", label: "Trang chủ", icon: "zi-home" },
  { key: "/news", label: "Tin tức", icon: "zi-list-1" },
  { key: "/forum", label: "Diễn đàn", icon: "zi-chat" },
  { key: "/notifications", label: "Thông báo", icon: "zi-notif" },
  { key: "/account", label: "Tài khoản", icon: "zi-user" },
] as const;

// Ẩn thanh điều hướng ở màn hình đăng nhập và trang chi tiết bài viết
// (những nơi có thanh nhập liệu riêng ở dưới).
const HIDE_ON = (path: string) =>
  path === "/login" || /^\/forum\/.+/.test(path);

// Icon kèm badge số thông báo chưa đọc (chỉ hiện khi > 0).
function TabIcon({ icon, badge }: { icon: string; badge?: number }) {
  return (
    <span className="nav-icon">
      <Icon icon={icon as React.ComponentProps<typeof Icon>["icon"]} />
      {badge && badge > 0 ? (
        <span className="nav-badge">{badge > 9 ? "9+" : badge}</span>
      ) : null}
    </span>
  );
}

// Thanh điều hướng dưới cùng dùng component + icon chính chủ của Zalo UI.
export function NavBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;
  const { signedIn } = useAuth();
  const [unread, setUnread] = useState(0);

  // Cập nhật badge khi đăng nhập/đổi trạng thái và mỗi lần điều hướng
  // (vd sau khi mở trang Thông báo và đọc xong thì badge tự giảm).
  useEffect(() => {
    if (signedIn) fetchUnreadCount().then(setUnread).catch(() => setUnread(0));
    else setUnread(0);
  }, [signedIn, path]);

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
        <BottomNavigation.Item
          key={t.key}
          label={t.label}
          icon={
            <TabIcon
              icon={t.icon}
              badge={t.key === "/notifications" ? unread : undefined}
            />
          }
        />
      ))}
    </BottomNavigation>
  );
}
