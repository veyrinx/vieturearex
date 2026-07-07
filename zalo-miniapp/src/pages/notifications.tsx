import React, { useCallback, useState } from "react";
import { Page, Header, Box, Text, Icon, Button, useNavigate, useSnackbar } from "zmp-ui";
import { openWebview } from "zmp-sdk/apis";
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "../api";
import { useAsync } from "../hooks/useAsync";
import { Loading, ErrorState } from "../components/states";
import { useAuth } from "../hooks/useAuth";
import type { Notification } from "../types";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "vừa xong";
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} ngày trước`;
  return new Date(iso).toLocaleDateString("vi-VN");
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const snackbar = useSnackbar();
  const { signedIn } = useAuth();

  const { data, loading, error, reload } = useAsync(fetchNotifications);
  const [items, setItems] = useState<Notification[] | null>(null);
  const list = items ?? data ?? [];

  const openItem = useCallback((n: Notification) => {
    if (!n.read_at) {
      void markNotificationRead(n.id);
      setItems((prev) =>
        (prev ?? data ?? []).map((x) =>
          x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x,
        ),
      );
    }
    if (n.entity_url) {
      openWebview({ url: n.entity_url }).catch(() => window.open(n.entity_url!, "_blank"));
    }
  }, [data]);

  const markAll = useCallback(async () => {
    await markAllNotificationsRead();
    setItems((prev) =>
      (prev ?? data ?? []).map((x) => ({ ...x, read_at: x.read_at ?? new Date().toISOString() })),
    );
    snackbar.openSnackbar({ text: "Đã đánh dấu tất cả đã đọc.", type: "success" });
  }, [data, snackbar]);

  if (!signedIn) {
    return (
      <Page className="page">
        <Header title="Thông báo" />
        <Box className="auth-card" flex flexDirection="column" alignItems="center">
          <Text className="muted" style={{ textAlign: "center", marginBottom: 12 }}>
            Đăng nhập để xem thông báo của bạn.
          </Text>
          <Button fullWidth onClick={() => navigate("/login")}>Đăng nhập</Button>
        </Box>
      </Page>
    );
  }

  const hasUnread = list.some((n) => !n.read_at);

  return (
    <Page className="page">
      <Header title="Thông báo" />

      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState onRetry={reload} />
      ) : list.length === 0 ? (
        <Box className="empty-box" flex flexDirection="column" alignItems="center">
          <Icon icon="zi-notif" style={{ fontSize: 40, color: "var(--muted)" }} />
          <Text className="muted" style={{ marginTop: 8 }}>Chưa có thông báo</Text>
        </Box>
      ) : (
        <>
          {hasUnread && (
            <Box flex justifyContent="flex-end">
              <Text
                size="xSmall"
                style={{ color: "var(--accent)", fontWeight: 600 }}
                onClick={markAll}
              >
                Đánh dấu tất cả đã đọc
              </Text>
            </Box>
          )}
          <Box className="list">
            {list.map((n) => (
              <Box
                key={n.id}
                className={`notif${n.read_at ? "" : " unread"}`}
                flex
                alignItems="flex-start"
                onClick={() => openItem(n)}
              >
                <Box className="notif-dot" style={{ opacity: n.read_at ? 0 : 1 }} />
                <Box flex flexDirection="column" style={{ flex: 1, minWidth: 0 }}>
                  <Text size="small" bold className="row-title">{n.title}</Text>
                  {n.body && (
                    <Text size="xSmall" className="muted" style={{ marginTop: 2 }}>{n.body}</Text>
                  )}
                  <Text size="xxSmall" className="muted" style={{ marginTop: 4 }}>
                    {timeAgo(n.created_at)}
                  </Text>
                </Box>
                {n.entity_url && <Icon icon="zi-chevron-right" className="muted" />}
              </Box>
            ))}
          </Box>
        </>
      )}
    </Page>
  );
}
