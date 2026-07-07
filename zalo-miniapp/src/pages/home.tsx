import React, { useEffect, useState } from "react";
import { Page, Box, Text, Icon, Avatar, Button, useNavigate } from "zmp-ui";
import { openWebview } from "zmp-sdk/apis";
import { useAuth } from "../hooks/useAuth";
import { fetchUnreadCount } from "../api";
import { SITE_URL, COMMUNITY_URL } from "../config";

type Feature = {
  key: string;
  icon: React.ComponentProps<typeof Icon>["icon"];
  label: string;
  desc: string;
  color: string;
};

const FEATURES: Feature[] = [
  { key: "/news", icon: "zi-list-1", label: "Tin tức", desc: "Cập nhật mới nhất", color: "#3b82f6" },
  { key: "/events", icon: "zi-calendar", label: "Sự kiện", desc: "Sự kiện in-game", color: "#10b981" },
  { key: "/tournaments", icon: "zi-star", label: "Giải đấu", desc: "Bracket & kết quả", color: "#f59e0b" },
  { key: "/forum", icon: "zi-chat", label: "Diễn đàn", desc: "Thảo luận cộng đồng", color: "#ec4899" },
  { key: "/leaderboard", icon: "zi-poll", label: "Xếp hạng", desc: "Top tuyển thủ", color: "#8b5cf6" },
  { key: "__community", icon: "zi-group", label: "Cộng đồng", desc: "Nhóm Zalo Arex", color: "#ef4444" },
];

function openExternal(url: string) {
  openWebview({ url }).catch(() => window.open(url, "_blank"));
}

export default function HomePage() {
  const navigate = useNavigate();
  const { signedIn, profile } = useAuth();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (signedIn) fetchUnreadCount().then(setUnread).catch(() => setUnread(0));
    else setUnread(0);
  }, [signedIn]);

  const name = signedIn
    ? profile?.display_name || profile?.email?.split("@")[0] || "bạn"
    : null;

  const onFeature = (f: Feature) => {
    if (f.key === "__community") openExternal(COMMUNITY_URL);
    else navigate(f.key);
  };

  return (
    <Page className="page home">
      {/* Hero gradient — bản sắc riêng của mini app Zalo */}
      <Box className="home-hero">
        <Box className="home-hero-top" flex alignItems="center" justifyContent="space-between">
          <Text className="brand">AREX · FREE FIRE</Text>
          <Box className="bell" onClick={() => navigate(signedIn ? "/notifications" : "/login")}>
            <Icon icon="zi-notif" style={{ color: "#fff" }} />
            {unread > 0 && <span className="bell-dot">{unread > 9 ? "9+" : unread}</span>}
          </Box>
        </Box>

        <Box className="home-hero-user" flex alignItems="center" onClick={() => navigate("/account")}>
          <Avatar size={52} src={profile?.avatar_url || undefined} online={signedIn}>
            {(name ?? "A").charAt(0).toUpperCase()}
          </Avatar>
          <Box ml={4} flex flexDirection="column" style={{ minWidth: 0, flex: 1 }}>
            <Text.Title size="normal" style={{ color: "#fff" }}>
              {name ? `Xin chào, ${name}!` : "Chào mừng bạn!"}
            </Text.Title>
            <Text size="xSmall" style={{ color: "rgba(255,255,255,.8)" }}>
              {signedIn ? `⭐ ${profile?.points ?? 0} điểm cộng đồng` : "Đăng nhập để dùng đầy đủ"}
            </Text>
          </Box>
          <Icon icon="zi-chevron-right" style={{ color: "rgba(255,255,255,.8)" }} />
        </Box>
      </Box>

      {!signedIn && (
        <Box className="login-cta" flex alignItems="center" justifyContent="space-between">
          <Box flex flexDirection="column" style={{ flex: 1 }}>
            <Text bold>Đăng nhập tài khoản Arex</Text>
            <Text size="xSmall" className="muted">
              1 chạm bằng Zalo — tham gia diễn đàn, tích điểm, bình luận.
            </Text>
          </Box>
          <Button size="small" onClick={() => navigate("/login")}>Đăng nhập</Button>
        </Box>
      )}

      <Text className="section-title">Khám phá</Text>
      <Box className="feature-grid">
        {FEATURES.map((f) => (
          <Box key={f.key} className="feature-card" onClick={() => onFeature(f)}>
            <Box className="feature-icon" style={{ background: `${f.color}22` }}>
              <Icon icon={f.icon} style={{ color: f.color }} />
            </Box>
            <Text size="small" bold>{f.label}</Text>
            <Text size="xxSmall" className="muted">{f.desc}</Text>
          </Box>
        ))}
      </Box>

      <Box
        className="cta"
        flex
        alignItems="center"
        justifyContent="space-between"
        onClick={() => openExternal(SITE_URL)}
      >
        <Box flex flexDirection="column">
          <Text bold style={{ color: "#fff" }}>Mở trang web đầy đủ</Text>
          <Text size="xSmall" style={{ color: "rgba(255,255,255,.85)" }}>arexnetwork.site</Text>
        </Box>
        <Icon icon="zi-chevron-right" style={{ color: "#fff" }} />
      </Box>
    </Page>
  );
}
