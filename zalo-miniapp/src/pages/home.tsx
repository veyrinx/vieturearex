import React from "react";
import { Page, Box, Text, Icon, Avatar, Header, useNavigate } from "zmp-ui";
import { openWebview } from "zmp-sdk/apis";
import { useUser } from "../hooks/useUser";
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
  { key: "/leaderboard", icon: "zi-poll", label: "Xếp hạng", desc: "Top tuyển thủ", color: "#8b5cf6" },
  { key: "__community", icon: "zi-chat", label: "Cộng đồng", desc: "Nhóm Zalo Arex", color: "#ef4444" },
];

function openExternal(url: string) {
  openWebview({ url }).catch(() => window.open(url, "_blank"));
}

export default function HomePage() {
  const user = useUser();
  const navigate = useNavigate();

  const onFeature = (f: Feature) => {
    if (f.key === "__community") openExternal(COMMUNITY_URL);
    else navigate(f.key);
  };

  return (
    <Page className="page">
      <Header title="Arex Free Fire" showBackIcon={false} />

      <Box className="hero" flex alignItems="center">
        <Avatar size={48} src={user?.avatar} online>
          {user ? user.name.charAt(0).toUpperCase() : "A"}
        </Avatar>
        <Box ml={4} flex flexDirection="column" style={{ minWidth: 0 }}>
          <Text.Title size="small">{user ? `Xin chào, ${user.name}!` : "Xin chào!"}</Text.Title>
          <Text size="xSmall" className="muted">
            Cộng đồng Free Fire – Arex
          </Text>
        </Box>
      </Box>

      <Box className="feature-grid">
        {FEATURES.map((f) => (
          <Box key={f.key} className="feature-card" onClick={() => onFeature(f)}>
            <Box className="feature-icon" style={{ background: `${f.color}22` }}>
              <Icon icon={f.icon} style={{ color: f.color }} />
            </Box>
            <Text size="small" bold>
              {f.label}
            </Text>
            <Text size="xxSmall" className="muted">
              {f.desc}
            </Text>
          </Box>
        ))}
      </Box>

      <Box className="cta" flex alignItems="center" justifyContent="space-between" onClick={() => openExternal(SITE_URL)}>
        <Box flex flexDirection="column">
          <Text bold style={{ color: "#fff" }}>
            Mở trang web đầy đủ
          </Text>
          <Text size="xSmall" style={{ color: "rgba(255,255,255,.85)" }}>
            arexnetwork.site
          </Text>
        </Box>
        <Icon icon="zi-chevron-right" style={{ color: "#fff" }} />
      </Box>
    </Page>
  );
}
