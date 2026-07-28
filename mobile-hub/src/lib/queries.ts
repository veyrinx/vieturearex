import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  ActivityLog,
  Announcement,
  AppRelease,
  CommentItem,
  CommentStatus,
  CommentTable,
  EventItem,
  ForumItem,
  ForumKind,
  GalleryItem,
  NewsItem,
  StatsResponse,
  UserItem,
  UserRole,
} from "@/types";

/** Khoá cache tập trung — tránh gõ nhầm chuỗi ở nhiều nơi. */
export const qk = {
  news: ["news"] as const,
  events: ["events"] as const,
  gallery: ["gallery"] as const,
  comments: (table: CommentTable, status: string) => ["comments", table, status] as const,
  forum: (kind: ForumKind, status: string) => ["forum", kind, status] as const,
  users: ["users"] as const,
  logs: ["logs"] as const,
  stats: ["stats"] as const,
  announcements: ["announcements"] as const,
  releases: ["releases"] as const,
};

// ── Nội dung ────────────────────────────────────────────────────────────────

export function useNews() {
  return useQuery({
    queryKey: qk.news,
    queryFn: () => api<{ news: NewsItem[] }>("/api/admin/news").then((r) => r.news ?? []),
  });
}

export type NewsPayload = {
  id?: string;
  title: string;
  slug?: string;
  excerpt: string;
  content: string;
  cover: string;
  category: string;
  status: "draft" | "published";
  created_at?: string;
  scheduled_at?: string | null;
};

export function useSaveNews() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: NewsPayload) =>
      api<{ article: NewsItem }>("/api/admin/news", {
        method: payload.id ? "PATCH" : "POST",
        body: payload,
      }),
    onSuccess: () => invalidateContent(queryClient),
  });
}

export function useDeleteNews() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api("/api/admin/news", { method: "DELETE", body: { id } }),
    onSuccess: () => invalidateContent(queryClient),
  });
}

export function useEvents() {
  return useQuery({
    queryKey: qk.events,
    queryFn: () => api<{ events: EventItem[] }>("/api/admin/events").then((r) => r.events ?? []),
  });
}

export type EventPayload = {
  id?: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  image_url: string;
  thumbnail_url?: string;
  link?: string;
  server_region?: string;
  status?: "active" | "upcoming" | "expired";
};

export function useSaveEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: EventPayload) =>
      api<{ event: EventItem }>("/api/admin/events", {
        method: payload.id ? "PATCH" : "POST",
        body: payload,
      }),
    onSuccess: () => invalidateContent(queryClient),
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api("/api/admin/events", { method: "DELETE", body: { id } }),
    onSuccess: () => invalidateContent(queryClient),
  });
}

export function useGallery() {
  return useQuery({
    queryKey: qk.gallery,
    queryFn: () => api<{ gallery: GalleryItem[] }>("/api/admin/gallery").then((r) => r.gallery ?? []),
  });
}

export function useAddGallery() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { image_url: string; tag: string }) =>
      api<{ item: GalleryItem }>("/api/admin/gallery", { method: "POST", body: payload }),
    onSuccess: () => invalidateContent(queryClient),
  });
}

export function useDeleteGallery() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api("/api/admin/gallery", { method: "DELETE", body: { id } }),
    onSuccess: () => invalidateContent(queryClient),
  });
}

function invalidateContent(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: qk.news });
  void queryClient.invalidateQueries({ queryKey: qk.events });
  void queryClient.invalidateQueries({ queryKey: qk.gallery });
  void queryClient.invalidateQueries({ queryKey: qk.logs });
}

// ── Kiểm duyệt ──────────────────────────────────────────────────────────────

export function useComments(table: CommentTable, status: string) {
  return useQuery({
    queryKey: qk.comments(table, status),
    queryFn: () =>
      api<{ comments: CommentItem[] }>(
        `/api/admin/comments?table=${table}&status=${encodeURIComponent(status)}`,
      ).then((r) => r.comments ?? []),
  });
}

export function useModerateComments() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { ids: string[]; status: CommentStatus; table: CommentTable }) =>
      api<{ ok: boolean; updated: number }>("/api/admin/comments", {
        method: "PATCH",
        body: input,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["comments"] });
      void queryClient.invalidateQueries({ queryKey: qk.logs });
    },
  });
}

export function useDeleteComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; table: CommentTable }) =>
      api("/api/admin/comments", { method: "DELETE", body: input }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["comments"] });
      void queryClient.invalidateQueries({ queryKey: qk.logs });
    },
  });
}

export function useForum(kind: ForumKind, status: string) {
  return useQuery({
    queryKey: qk.forum(kind, status),
    queryFn: () =>
      api<{ items: ForumItem[] }>(
        `/api/admin/forum?type=${kind}&status=${encodeURIComponent(status)}`,
      ).then((r) => r.items ?? []),
  });
}

export type ForumAction = "pin" | "lock" | "remove" | "restore";

export function useModerateForum() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; type: "post" | "reply"; action: ForumAction; value?: boolean }) =>
      api("/api/admin/forum", { method: "PATCH", body: input }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["forum"] });
      void queryClient.invalidateQueries({ queryKey: qk.logs });
    },
  });
}

export function useDeleteForumItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; type: "post" | "reply" }) =>
      api("/api/admin/forum", { method: "DELETE", body: input }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["forum"] });
      void queryClient.invalidateQueries({ queryKey: qk.logs });
    },
  });
}

// ── Người dùng ──────────────────────────────────────────────────────────────

export function useUsers(enabled = true) {
  return useQuery({
    queryKey: qk.users,
    enabled,
    queryFn: () => api<{ users: UserItem[] }>("/api/admin/users").then((r) => r.users ?? []),
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (
      body:
        | { id: string; is_banned: boolean }
        | { id: string; is_verified: boolean }
        | { id: string; role: UserRole }
        | { id: string; action: "update_info"; display_name?: string; bio?: string; phone?: string },
    ) => api<{ user: UserItem }>("/api/admin/users", { method: "PATCH", body }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.users });
      void queryClient.invalidateQueries({ queryKey: qk.logs });
    },
  });
}

// ── Hệ thống ────────────────────────────────────────────────────────────────

export function useStats() {
  return useQuery({
    queryKey: qk.stats,
    queryFn: () => api<StatsResponse>("/api/admin/stats"),
  });
}

export function useLogs(enabled = true) {
  return useQuery({
    queryKey: qk.logs,
    enabled,
    queryFn: () => api<{ logs: ActivityLog[] }>("/api/admin/logs").then((r) => r.logs ?? []),
  });
}

export function useAnnouncements(enabled = true) {
  return useQuery({
    queryKey: qk.announcements,
    enabled,
    queryFn: () =>
      api<{ announcements: Announcement[] }>("/api/admin/broadcast").then(
        (r) => r.announcements ?? [],
      ),
  });
}

export function useCreateAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      title: string;
      message: string;
      type: Announcement["type"];
      is_active: boolean;
      ends_at?: string | null;
    }) => api<{ ok: boolean; id: string }>("/api/admin/broadcast", { method: "POST", body }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.announcements });
      void queryClient.invalidateQueries({ queryKey: qk.logs });
    },
  });
}

export function useReleases(enabled = true) {
  return useQuery({
    queryKey: qk.releases,
    enabled,
    queryFn: () =>
      api<{ releases: AppRelease[] }>("/api/admin/app-releases").then((r) => r.releases ?? []),
  });
}
