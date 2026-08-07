import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { checkForBundleUpdate } from "@/lib/updater";
import { platform } from "@/lib/native";
import { env } from "@/env";
import type {
  ActivityLog,
  Announcement,
  AppRelease,
  AppUpdateCheck,
  CommentItem,
  CommentStatus,
  CommentTable,
  EventItem,
  ForumItem,
  ForumKind,
  GalleryItem,
  NewsItem,
  NotificationItem,
  ShopDisputeItem,
  ShopListingItem,
  ShopOrderItem,
  ShopSellerItem,
  SiteSetting,
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
  bundleUpdate: ["bundle-update"] as const,
  appUpdate: ["app-update"] as const,
  settings: ["settings"] as const,
  notifications: ["notifications"] as const,
  unreadCount: ["notifications", "unread-count"] as const,
  shopListings: (status: string) => ["shop-listings", status] as const,
  shopOrders: (status: string) => ["shop-orders", status] as const,
  shopDisputes: (status: string) => ["shop-disputes", status] as const,
  shopSellers: (status: string) => ["shop-sellers", status] as const,
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

/**
 * Gửi mail đặt lại mật khẩu cho một tài khoản.
 *
 * Không đổi mật khẩu hộ — chỉ bắn link, chủ tài khoản tự đặt. Quyền admin.
 */
export function useResetPassword() {
  return useMutation({
    mutationFn: (id: string) =>
      api("/api/admin/users/reset-password", { method: "POST", body: { id } }),
  });
}

/**
 * Đá tài khoản ra khỏi mọi thiết bị (huỷ toàn bộ phiên).
 *
 * Dùng khi máy bị mất hoặc nghi lộ mật khẩu. Không đụng tới trạng thái khoá —
 * người đó đăng nhập lại là vào được, muốn chặn hẳn thì phải khoá tài khoản.
 */
export function useForceSignOut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api("/api/admin/users/signout", { method: "POST", body: { id } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.users }),
  });
}

/** Cài đặt site. Khoá bí mật được server thay bằng mặt nạ, không trả giá trị thật. */
export function useSettings() {
  return useQuery({
    queryKey: qk.settings,
    queryFn: () =>
      api<{ settings: SiteSetting[] }>("/api/admin/settings").then((r) => r.settings ?? []),
  });
}

/**
 * Lưu cài đặt. API chỉ nhận MỘT khoá mỗi lần nên phải gọi lần lượt — gửi song
 * song sẽ đụng giới hạn tần suất (30 lần/phút) và làm revalidate chạy chồng.
 */
export function useSaveSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (changes: Record<string, string>) => {
      for (const [key, value] of Object.entries(changes)) {
        await api("/api/admin/settings", { method: "PATCH", body: { key, value } });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.settings }),
  });
}

/**
 * Có bundle web mới hơn bản đang chạy không (cập nhật nóng — xem lib/updater.ts).
 *
 * Link tải trong kết quả là signed URL sống 30 phút, nên đừng cache lâu: quá
 * hạn mà đem đi tải thì Supabase trả 400.
 */
export function useBundleUpdate() {
  return useQuery({
    queryKey: qk.bundleUpdate,
    queryFn: () => checkForBundleUpdate(),
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    retry: false,
  });
}

/**
 * Có bản CÀI ĐẶT (APK/IPA) mới hơn bản đang chạy không.
 *
 * Khác useBundleUpdate: cập nhật nóng chỉ thay được JS/CSS, còn khi phần native
 * đổi thì bắt buộc tải file cài về cài đè. CI đẩy file lên kho ngay sau khi
 * dựng xong nên chỗ này luôn thấy bản mới nhất.
 */
export function useAppUpdate() {
  return useQuery({
    queryKey: qk.appUpdate,
    queryFn: () =>
      api<AppUpdateCheck>(
        `/api/hub/app/latest?platform=${platform === "ios" ? "ios" : "android"}` +
          `&current=${encodeURIComponent(env.appVersion)}`,
      ),
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    retry: false,
  });
}

// ── Chợ Arex ────────────────────────────────────────────────────────────────
/**
 * Hub dùng thẳng API của chợ (`/api/shop/*`) chứ không có endpoint admin
 * riêng: quyền đã được kiểm ngay trong các route đó theo vai trò tài khoản,
 * nên không cần lớp trung gian nào nữa.
 */

export function useShopListings(status: string, enabled = true) {
  return useQuery({
    queryKey: qk.shopListings(status),
    enabled,
    queryFn: () =>
      api<{ listings: ShopListingItem[] }>(
        `/api/shop/listings?status=${encodeURIComponent(status)}&limit=100`,
      ).then((r) => r.listings ?? []),
  });
}

export function useModerateListing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; status: "active" | "rejected" | "hidden"; reason?: string }) =>
      api(`/api/shop/listings/${input.id}`, {
        method: "PATCH",
        body: { status: input.status, reason: input.reason },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["shop-listings"] });
      void queryClient.invalidateQueries({ queryKey: qk.logs });
    },
  });
}

export function useFeatureListing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; days: number }) =>
      api(`/api/shop/listings/${input.id}`, {
        method: "PATCH",
        body: { action: "feature", days: input.days },
      }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["shop-listings"] }),
  });
}

export function useShopOrders(status: string) {
  return useQuery({
    queryKey: qk.shopOrders(status),
    queryFn: () =>
      api<{ orders: ShopOrderItem[] }>(
        `/api/shop/orders?scope=all${status === "all" ? "" : `&status=${encodeURIComponent(status)}`}`,
      ).then((r) => r.orders ?? []),
  });
}

export function useShopDisputes(status: string, enabled = true) {
  return useQuery({
    queryKey: qk.shopDisputes(status),
    enabled,
    queryFn: () =>
      api<{ disputes: ShopDisputeItem[] }>(
        `/api/shop/disputes${status === "all" ? "" : `?status=${encodeURIComponent(status)}`}`,
      ).then((r) => r.disputes ?? []),
  });
}

export function useShopSellers(status: string, enabled = true) {
  return useQuery({
    queryKey: qk.shopSellers(status),
    enabled,
    queryFn: () =>
      api<{ sellers: ShopSellerItem[] }>(
        `/api/shop/sellers${status === "all" ? "" : `?status=${encodeURIComponent(status)}`}`,
      ).then((r) => r.sellers ?? []),
  });
}

export function useModerateSeller() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      id: string;
      status: "approved" | "rejected" | "suspended";
      reason?: string;
    }) =>
      api(`/api/shop/sellers/${input.id}`, {
        method: "PATCH",
        body: { status: input.status, reason: input.reason },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["shop-sellers"] });
      void queryClient.invalidateQueries({ queryKey: qk.logs });
    },
  });
}

// ── Thông báo ───────────────────────────────────────────────────────────────
/**
 * Chuông trong Hub dùng chung dữ liệu với chuông trên web (`/api/notifications`).
 *
 * Khác `src/lib/notify.ts`: file kia lo việc bắn thông báo hệ điều hành khi app
 * đang mở, còn đây là danh sách đọc được trong app — mở app lúc nào cũng thấy
 * đủ, kể cả những cái đã lỡ khi app đóng.
 */

export function useNotifications() {
  return useQuery({
    queryKey: qk.notifications,
    queryFn: () => api<NotificationItem[]>("/api/notifications"),
    // Chuông là thứ người ta mong thấy ngay; 60 giây một nhịp là đủ tươi.
    refetchInterval: 60_000,
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: qk.unreadCount,
    queryFn: () => api<{ count: number }>("/api/notifications?count=true").then((r) => r.count ?? 0),
    refetchInterval: 60_000,
  });
}

export function useMarkNotifications() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id?: string; all?: boolean }) =>
      api("/api/notifications", { method: "PATCH", body: input }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.notifications });
      void queryClient.invalidateQueries({ queryKey: qk.unreadCount });
    },
  });
}
