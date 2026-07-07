import React from "react";
import { Page, Header, Box, Text, Avatar, Button, Icon, useNavigate, useSnackbar } from "zmp-ui";
import { openWebview } from "zmp-sdk/apis";
import { useAuth } from "../hooks/useAuth";
import { Loading } from "../components/states";
import { SITE_URL } from "../config";

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Quản trị tối cao",
  admin: "Quản trị viên",
  it: "Kỹ thuật",
  manager: "Quản lý",
  support: "Hỗ trợ",
  user: "Thành viên",
};

function openExternal(url: string) {
  openWebview({ url }).catch(() => window.open(url, "_blank"));
}

export default function AccountPage() {
  const navigate = useNavigate();
  const snackbar = useSnackbar();
  const { loading, signedIn, profile, signOut } = useAuth();

  if (loading) {
    return (
      <Page className="page">
        <Header title="Tài khoản" showBackIcon={false} />
        <Loading />
      </Page>
    );
  }

  // Chưa đăng nhập → mời đăng nhập.
  if (!signedIn) {
    return (
      <Page className="page">
        <Header title="Tài khoản" showBackIcon={false} />
        <Box className="auth-card" flex flexDirection="column" alignItems="center">
          <Box className="feature-icon" style={{ background: "#ff7a0022", width: 56, height: 56 }}>
            <Icon icon="zi-user" style={{ color: "var(--accent)", fontSize: 28 }} />
          </Box>
          <Text.Title size="small" style={{ marginTop: 12 }}>
            Bạn chưa đăng nhập
          </Text.Title>
          <Text size="xSmall" className="muted" style={{ textAlign: "center", margin: "6px 0 16px" }}>
            Đăng nhập để tham gia diễn đàn, tích điểm và dùng đầy đủ tính năng.
          </Text>
          <Button fullWidth onClick={() => navigate("/login")}>
            Đăng nhập / Đăng ký
          </Button>
        </Box>
      </Page>
    );
  }

  const name = profile?.display_name || profile?.email?.split("@")[0] || "Thành viên";
  const joined = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("vi-VN")
    : "";

  const onSignOut = async () => {
    await signOut();
    snackbar.openSnackbar({ text: "Đã đăng xuất.", type: "success" });
    navigate("/", { animate: false });
  };

  return (
    <Page className="page">
      <Header title="Tài khoản" showBackIcon={false} />

      <Box className="profile-hero" flex flexDirection="column" alignItems="center">
        <Avatar size={72} src={profile?.avatar_url || undefined}>
          {name.charAt(0).toUpperCase()}
        </Avatar>
        <Box flex alignItems="center" style={{ marginTop: 10, gap: 6 }}>
          <Text.Title size="normal">{name}</Text.Title>
          {profile?.is_verified && (
            <Icon icon="zi-check-circle-solid" style={{ color: "#2563eb", fontSize: 18 }} />
          )}
        </Box>
        <Text size="xSmall" className="muted">
          {ROLE_LABELS[profile?.role ?? "user"] ?? "Thành viên"}
          {joined ? ` · Tham gia ${joined}` : ""}
        </Text>
      </Box>

      <Box className="stat-grid">
        <Box className="stat-card">
          <Text.Title size="normal" style={{ color: "var(--accent)" }}>
            {profile?.points ?? 0}
          </Text.Title>
          <Text size="xxSmall" className="muted">Điểm</Text>
        </Box>
        <Box className="stat-card">
          <Text.Title size="normal" style={{ color: "var(--accent)" }}>
            {profile?.views ?? 0}
          </Text.Title>
          <Text size="xxSmall" className="muted">Lượt xem hồ sơ</Text>
        </Box>
      </Box>

      <Box className="list">
        <Box className="row" flex alignItems="center">
          <Icon icon="zi-user" className="muted" />
          <Box flex flexDirection="column" style={{ flex: 1, minWidth: 0, marginLeft: 12 }}>
            <Text size="xSmall" className="muted">Email</Text>
            <Text className="row-title">{profile?.email ?? "—"}</Text>
          </Box>
        </Box>
        {profile?.ff_id && (
          <Box className="row" flex alignItems="center">
            <Icon icon="zi-star" className="muted" />
            <Box flex flexDirection="column" style={{ flex: 1, minWidth: 0, marginLeft: 12 }}>
              <Text size="xSmall" className="muted">Free Fire ID</Text>
              <Text className="row-title">{profile.ff_id}</Text>
            </Box>
          </Box>
        )}
      </Box>

      <Box className="list">
        <Box className="row" flex alignItems="center" onClick={() => navigate("/edit-profile")}>
          <Icon icon="zi-edit" style={{ color: "var(--accent)" }} />
          <Text style={{ flex: 1, marginLeft: 12 }}>Chỉnh sửa hồ sơ</Text>
          <Icon icon="zi-chevron-right" className="muted" />
        </Box>
        <Box className="row" flex alignItems="center" onClick={() => navigate("/notifications")}>
          <Icon icon="zi-notif" style={{ color: "var(--accent)" }} />
          <Text style={{ flex: 1, marginLeft: 12 }}>Thông báo</Text>
          <Icon icon="zi-chevron-right" className="muted" />
        </Box>
        <Box className="row" flex alignItems="center" onClick={() => navigate("/forum")}>
          <Icon icon="zi-chat" style={{ color: "var(--accent)" }} />
          <Text style={{ flex: 1, marginLeft: 12 }}>Bài viết diễn đàn</Text>
          <Icon icon="zi-chevron-right" className="muted" />
        </Box>
        <Box
          className="row"
          flex
          alignItems="center"
          onClick={() => openExternal(`${SITE_URL}/u/${profile?.id ?? ""}`)}
        >
          <Icon icon="zi-more-grid" className="muted" />
          <Text style={{ flex: 1, marginLeft: 12 }}>Xem hồ sơ đầy đủ trên web</Text>
          <Icon icon="zi-chevron-right" className="muted" />
        </Box>
      </Box>

      <Button variant="secondary" fullWidth onClick={onSignOut} style={{ marginTop: 8 }}>
        Đăng xuất
      </Button>
    </Page>
  );
}
