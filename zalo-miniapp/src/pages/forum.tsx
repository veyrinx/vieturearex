import React, { useMemo, useState } from "react";
import {
  Page, Header, Box, Text, Icon, Avatar, Button, Modal, Input, Select, useNavigate, useSnackbar,
} from "zmp-ui";
import { useAsync } from "../hooks/useAsync";
import { fetchForum, createForumPost } from "../api";
import { Loading, ErrorState, Empty } from "../components/states";
import { useAuth } from "../hooks/useAuth";

export const FORUM_CATEGORIES = [
  "Thảo luận", "Hướng dẫn", "Sự kiện & Giải đấu",
  "Clan & Team", "Free Fire", "Góp ý & Báo lỗi",
];

const { Option } = Select;

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "vừa xong";
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  return new Date(iso).toLocaleDateString("vi-VN");
}

export default function ForumPage() {
  const navigate = useNavigate();
  const snackbar = useSnackbar();
  const { signedIn } = useAuth();

  const load = useMemo(() => () => fetchForum("all", "latest", 1), []);
  const { data, loading, error, reload } = useAsync(load);

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState(FORUM_CATEGORIES[0]);
  const [submitting, setSubmitting] = useState(false);

  const openCompose = () => {
    if (!signedIn) {
      snackbar.openSnackbar({ text: "Vui lòng đăng nhập để đăng bài.", type: "warning" });
      navigate("/login");
      return;
    }
    setOpen(true);
  };

  const submit = async () => {
    if (title.trim().length < 5) {
      snackbar.openSnackbar({ text: "Tiêu đề tối thiểu 5 ký tự.", type: "warning" });
      return;
    }
    if (content.trim().length < 20) {
      snackbar.openSnackbar({ text: "Nội dung tối thiểu 20 ký tự.", type: "warning" });
      return;
    }
    setSubmitting(true);
    try {
      const { id } = await createForumPost({ title: title.trim(), content: content.trim(), category });
      setOpen(false);
      setTitle("");
      setContent("");
      snackbar.openSnackbar({ text: "Đăng bài thành công!", type: "success" });
      navigate(`/forum/${id}`);
    } catch (e) {
      snackbar.openSnackbar({
        text: e instanceof Error ? e.message : "Không thể đăng bài.",
        type: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Page className="page">
      <Header title="Diễn đàn" showBackIcon={false} />

      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState onRetry={reload} />
      ) : !data || data.posts.length === 0 ? (
        <Empty label="Chưa có bài viết. Hãy là người đầu tiên!" />
      ) : (
        <Box className="list">
          {data.posts.map((p) => (
            <Box
              key={p.id}
              className="row"
              flex
              alignItems="flex-start"
              onClick={() => navigate(`/forum/${p.id}`)}
            >
              <Avatar size={40} src={p.avatar_url || undefined}>
                {(p.display_name || "?").charAt(0).toUpperCase()}
              </Avatar>
              <Box flex flexDirection="column" style={{ flex: 1, minWidth: 0, marginLeft: 12 }}>
                <Box flex alignItems="center" style={{ gap: 6 }}>
                  {p.is_pinned && <Icon icon="zi-notif" style={{ color: "var(--accent)", fontSize: 14 }} />}
                  <Text className="row-title">{p.title}</Text>
                </Box>
                <Text size="xxSmall" className="muted" style={{ marginTop: 4 }}>
                  {p.display_name || "Ẩn danh"} · {p.category} · {timeAgo(p.updated_at || p.created_at)}
                </Text>
                <Box flex alignItems="center" style={{ gap: 14, marginTop: 6 }}>
                  <Text size="xxSmall" className="muted">
                    <Icon icon="zi-chat" size={12} /> {p.reply_count}
                  </Text>
                  <Text size="xxSmall" className="muted">
                    <Icon icon="zi-clock-1" size={12} /> {p.view_count}
                  </Text>
                </Box>
              </Box>
            </Box>
          ))}
        </Box>
      )}

      {/* Nút tạo bài nổi */}
      <Box className="fab" onClick={openCompose}>
        <Icon icon="zi-plus" style={{ color: "#fff", fontSize: 26 }} />
      </Box>

      <Modal
        visible={open}
        title="Đăng bài mới"
        onClose={() => setOpen(false)}
        verticalActions
        actions={[
          { text: "Huỷ", close: true },
          { text: submitting ? "Đang đăng..." : "Đăng bài", highLight: true, onClick: submit },
        ]}
      >
        <Box flex flexDirection="column" style={{ gap: 12, paddingTop: 8 }}>
          <Input
            label="Tiêu đề"
            placeholder="Tiêu đề bài viết (≥ 5 ký tự)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
          />
          <Select
            label="Danh mục"
            value={category}
            closeOnSelect
            onChange={(v) => setCategory(String(v))}
          >
            {FORUM_CATEGORIES.map((c) => (
              <Option key={c} value={c} title={c} />
            ))}
          </Select>
          <Input.TextArea
            label="Nội dung"
            placeholder="Chia sẻ nội dung (≥ 20 ký tự)…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            showCount
            maxLength={20000}
          />
        </Box>
      </Modal>
    </Page>
  );
}
