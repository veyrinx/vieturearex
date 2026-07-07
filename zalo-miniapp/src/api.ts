import { API_BASE } from "./config";
import { getAccessToken } from "./lib/supabase";
import type {
  EventItem,
  ForumPost,
  ForumPostDetail,
  ForumReply,
  MyProfile,
  NewsItem,
  Notification,
  PlayerRank,
  ProfileUpdate,
} from "./types";

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

// Fetch có đính kèm access token của Supabase (nếu đã đăng nhập) để gọi API cần
// xác thực. Site nhận diện người dùng qua header Authorization: Bearer <jwt>.
async function authFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = await getAccessToken();
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(`${API_BASE}${path}`, { ...init, headers });
}

// ── Nội dung công khai ────────────────────────────────
// Danh sách tin tức (bỏ body nặng bằng content=0).
export async function fetchNews(): Promise<NewsItem[]> {
  const data = await getJson<{ news: NewsItem[] }>("/api/news?content=0");
  return data.news ?? [];
}

// Danh sách sự kiện (tất cả trạng thái, hiển thị active + upcoming trước).
export async function fetchEvents(): Promise<EventItem[]> {
  const data = await getJson<{ events: EventItem[] }>("/api/events?status=all");
  return data.events ?? [];
}


// Bảng xếp hạng tuyển thủ (top 20 theo điểm).
export async function fetchLeaderboard(): Promise<PlayerRank[]> {
  const data = await getJson<{ players: PlayerRank[] }>("/api/leaderboard");
  return data.players ?? [];
}

// ── Người dùng ────────────────────────────────────────
// Trả về null khi chưa đăng nhập (401) thay vì ném lỗi.
export async function fetchMyProfile(): Promise<MyProfile | null> {
  const res = await authFetch("/api/user/profile");
  if (res.status === 401) return null;
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as MyProfile;
}

// Cập nhật hồ sơ. Trả về true nếu thành công.
export async function updateMyProfile(input: ProfileUpdate): Promise<void> {
  const res = await authFetch("/api/user/profile", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error || "Không lưu được hồ sơ.");
  }
}

// ── Thông báo ─────────────────────────────────────────
export async function fetchNotifications(): Promise<Notification[]> {
  const res = await authFetch("/api/notifications");
  if (res.status === 401) return [];
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as Notification[];
  return Array.isArray(data) ? data : [];
}

export async function fetchUnreadCount(): Promise<number> {
  const res = await authFetch("/api/notifications?count=true");
  if (!res.ok) return 0;
  const data = (await res.json().catch(() => ({ count: 0 }))) as { count?: number };
  return data.count ?? 0;
}

export async function markNotificationRead(id: string): Promise<void> {
  await authFetch("/api/notifications", {
    method: "PATCH",
    body: JSON.stringify({ id }),
  });
}

export async function markAllNotificationsRead(): Promise<void> {
  await authFetch("/api/notifications", {
    method: "PATCH",
    body: JSON.stringify({ all: true }),
  });
}

// ── Diễn đàn ──────────────────────────────────────────
export async function fetchForum(
  category = "all",
  sort = "latest",
  page = 1,
): Promise<{ posts: ForumPost[]; total: number }> {
  const q = `category=${encodeURIComponent(category)}&sort=${sort}&page=${page}`;
  const data = await getJson<{ posts: ForumPost[]; total: number }>(`/api/forum?${q}`);
  return { posts: data.posts ?? [], total: data.total ?? 0 };
}

export async function fetchForumPost(id: string): Promise<ForumPostDetail> {
  return getJson<ForumPostDetail>(`/api/forum/${id}`);
}

export async function fetchForumReplies(id: string): Promise<ForumReply[]> {
  const data = await getJson<{ replies: ForumReply[] }>(`/api/forum/${id}/replies`);
  return data.replies ?? [];
}

export async function createForumPost(input: {
  title: string;
  content: string;
  category: string;
}): Promise<{ id: string }> {
  const res = await authFetch("/api/forum", {
    method: "POST",
    body: JSON.stringify(input),
  });
  const data = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
  if (!res.ok || !data.id) throw new Error(data.error || "Không thể đăng bài.");
  return { id: data.id };
}

export async function createForumReply(
  postId: string,
  content: string,
): Promise<ForumReply> {
  const res = await authFetch(`/api/forum/${postId}/replies`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
  const data = (await res.json().catch(() => ({}))) as ForumReply & { error?: string };
  if (!res.ok || !data.id) throw new Error(data.error || "Không thể gửi trả lời.");
  return data;
}
