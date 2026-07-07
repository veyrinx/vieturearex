import React, { useCallback, useMemo, useState } from "react";
import { Page, Header, Box, Text, Avatar, Icon, Input, Button, useSnackbar } from "zmp-ui";
import { useParams } from "react-router-dom";
import { fetchForumPost, fetchForumReplies, createForumReply } from "../api";
import { useAsync } from "../hooks/useAsync";
import { Loading, ErrorState } from "../components/states";
import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "zmp-ui";
import type { ForumReply } from "../types";

function fmt(iso: string): string {
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}

export default function ForumPostPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const snackbar = useSnackbar();
  const { signedIn } = useAuth();

  const loader = useMemo(
    () => async () => {
      const [post, replies] = await Promise.all([
        fetchForumPost(id),
        fetchForumReplies(id),
      ]);
      return { post, replies };
    },
    [id],
  );
  const { data, loading, error, reload } = useAsync(loader);

  const [replies, setReplies] = useState<ForumReply[] | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  // Đồng bộ replies từ server vào state cục bộ khi tải xong.
  const shownReplies = replies ?? data?.replies ?? [];

  const send = useCallback(async () => {
    if (!signedIn) {
      snackbar.openSnackbar({ text: "Đăng nhập để bình luận.", type: "warning" });
      navigate("/login");
      return;
    }
    if (text.trim().length < 2) return;
    setSending(true);
    try {
      const reply = await createForumReply(id, text.trim());
      setReplies([...(replies ?? data?.replies ?? []), reply]);
      setText("");
    } catch (e) {
      snackbar.openSnackbar({
        text: e instanceof Error ? e.message : "Không gửi được.",
        type: "error",
      });
    } finally {
      setSending(false);
    }
  }, [signedIn, text, id, replies, data, snackbar, navigate]);

  if (loading) {
    return (
      <Page className="page">
        <Header title="Bài viết" />
        <Loading />
      </Page>
    );
  }
  if (error || !data) {
    return (
      <Page className="page">
        <Header title="Bài viết" />
        <ErrorState onRetry={reload} />
      </Page>
    );
  }

  const { post } = data;

  return (
    <Page className="page" style={{ paddingBottom: 88 }}>
      <Header title="Bài viết" />

      <Box className="post-card" flex flexDirection="column">
        <Box flex alignItems="center" style={{ gap: 10 }}>
          <Avatar size={40} src={post.avatar_url || undefined}>
            {(post.display_name || "?").charAt(0).toUpperCase()}
          </Avatar>
          <Box flex flexDirection="column" style={{ minWidth: 0 }}>
            <Box flex alignItems="center" style={{ gap: 4 }}>
              <Text bold>{post.display_name || "Ẩn danh"}</Text>
              {post.is_verified && (
                <Icon icon="zi-check-circle-solid" style={{ color: "#2563eb", fontSize: 14 }} />
              )}
            </Box>
            <Text size="xxSmall" className="muted">
              {post.category} · {fmt(post.created_at)}
            </Text>
          </Box>
        </Box>

        <Text.Title size="small" style={{ marginTop: 12 }}>{post.title}</Text.Title>
        <Text style={{ marginTop: 8, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
          {post.content}
        </Text>

        <Box flex alignItems="center" style={{ gap: 16, marginTop: 12 }}>
          <Text size="xSmall" className="muted"><Icon icon="zi-chat" size={14} /> {shownReplies.length}</Text>
          <Text size="xSmall" className="muted"><Icon icon="zi-clock-1" size={14} /> {post.view_count}</Text>
        </Box>
      </Box>

      <Text bold style={{ margin: "4px 2px" }}>
        Bình luận ({shownReplies.length})
      </Text>

      {shownReplies.length === 0 ? (
        <Text size="xSmall" className="muted" style={{ padding: "8px 2px" }}>
          Chưa có bình luận. Hãy là người đầu tiên!
        </Text>
      ) : (
        <Box className="list">
          {shownReplies.map((r) => (
            <Box key={r.id} className="reply" flex alignItems="flex-start">
              <Avatar size={32} src={r.avatar_url || undefined}>
                {(r.display_name || "?").charAt(0).toUpperCase()}
              </Avatar>
              <Box flex flexDirection="column" style={{ flex: 1, minWidth: 0, marginLeft: 10 }}>
                <Box flex alignItems="center" style={{ gap: 4 }}>
                  <Text size="small" bold>{r.display_name || "Ẩn danh"}</Text>
                  {r.is_verified && (
                    <Icon icon="zi-check-circle-solid" style={{ color: "#2563eb", fontSize: 12 }} />
                  )}
                </Box>
                <Text size="small" style={{ whiteSpace: "pre-wrap", marginTop: 2 }}>{r.content}</Text>
                <Text size="xxSmall" className="muted" style={{ marginTop: 2 }}>{fmt(r.created_at)}</Text>
              </Box>
            </Box>
          ))}
        </Box>
      )}

      {/* Ô nhập bình luận cố định dưới cùng */}
      <Box className="reply-bar" flex alignItems="center">
        <Input
          placeholder={signedIn ? "Viết bình luận…" : "Đăng nhập để bình luận"}
          value={text}
          onChange={(e) => setText(e.target.value)}
          style={{ flex: 1 }}
        />
        <Button size="small" loading={sending} onClick={send} style={{ marginLeft: 8 }}>
          Gửi
        </Button>
      </Box>
    </Page>
  );
}
