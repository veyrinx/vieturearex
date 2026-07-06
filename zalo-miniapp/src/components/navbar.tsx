import React from "react";
import { BottomNavigation, Icon, useNavigate, useLocation } from "zmp-ui";

const TABS = [
  { key: "/", label: "Trang chủ", icon: "zi-home" },
  { key: "/news", label: "Tin tức", icon: "zi-list-1" },
  { key: "/events", label: "Sự kiện", icon: "zi-calendar" },
  { key: "/tournaments", label: "Giải đấu", icon: "zi-star" },
  { key: "/leaderboard", label: "BXH", icon: "zi-poll" },
] as const;

// Thanh điều hướng dưới cùng dùng component + icon chính chủ của Zalo UI.
export function NavBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const active = TABS.some((t) => t.key === location.pathname) ? location.pathname : "/";

  return (
    <BottomNavigation fixed activeKey={active} onChange={(key) => navigate(key)}>
      {TABS.map((t) => (
        <BottomNavigation.Item key={t.key} label={t.label} icon={<Icon icon={t.icon} />} />
      ))}
    </BottomNavigation>
  );
}
