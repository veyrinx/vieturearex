"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Bell, Trophy, Swords, Calendar, X, MessageCircleCheck,
  Star, Newspaper, MessageCircle, CheckCheck, Loader2, BookOpen,
  Users, Lock, ShieldAlert, UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  entity_type: string | null;
  entity_id: string | null;
  entity_url: string | null;
  read_at: string | null;
  created_at: string;
};

const TYPE_META: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  registration_approved: { icon: Trophy,             color: "text-emerald-500", label: "Giải đấu" },
  registration_rejected: { icon: X,                  color: "text-red-500",     label: "Giải đấu" },
  match_scheduled:       { icon: Calendar,           color: "text-blue-500",    label: "Lịch thi đấu" },
  match_result:          { icon: Swords,             color: "text-amber-500",   label: "Kết quả" },
  comment_approved:      { icon: MessageCircleCheck, color: "text-green-500",   label: "Bình luận" },
  comment_reply:         { icon: MessageCircle,      color: "text-blue-500",    label: "Trả lời" },
  rating_reply:          { icon: Star,               color: "text-yellow-500",  label: "Đánh giá" },
  new_article:           { icon: Newspaper,          color: "text-primary dark:text-amber-400", label: "Tin tức" },
  forum_reply:           { icon: MessageCircle,      color: "text-indigo-500",  label: "Diễn đàn" },
  forum_mention:         { icon: Users,              color: "text-violet-500",  label: "Diễn đàn" },
  wiki_approved:         { icon: BookOpen,           color: "text-emerald-500", label: "Wiki" },
  forum_locked:          { icon: Lock,               color: "text-muted-foreground", label: "Diễn đàn" },
  account_warning:       { icon: ShieldAlert,        color: "text-rose-500",    label: "Tài khoản" },
  user_follow:           { icon: UserPlus,           color: "text-pink-500",    label: "Follow" },
  bxh_rank_up:           { icon: Trophy,             color: "text-amber-500",   label: "BXH" },
};

const TYPE_FILTERS = [
  { key: "all",       label: "Tất cả" },
  { key: "unread",    label: "Chưa đọc" },
  { key: "forum",     label: "Diễn đàn" },
  { key: "tournament",label: "Giải đấu" },
  { key: "comment",   label: "Bình luận" },
  { key: "news",      label: "Tin tức" },
];

const FILTER_TYPE_MAP: Record<string, string[]> = {
  forum:      ["forum_reply", "forum_mention", "forum_locked"],
  tournament: ["registration_approved", "registration_rejected", "match_scheduled", "match_result"],
  comment:    ["comment_approved", "comment_reply", "rating_reply"],
  news:       ["new_article", "wiki_approved"],
};

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "vừa xong";
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} ngày trước`;
  return new Date(date).toLocaleDateString("vi-VN");
}

export function NotificationsClient() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications", { credentials: "same-origin" });
      if (!res.ok) {
        if (res.status === 401) {
          setNotifications([]);
          return;
        }
        throw new Error("Failed");
      }
      setNotifications(await res.json() as Notification[]);
    } catch {
      toast.error("Không thể tải thông báo");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const markAllRead = async () => {
    setMarkingAll(true);
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ all: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
    } catch {
      toast.error("Lỗi kết nối");
    } finally {
      setMarkingAll(false);
    }
  };

  const markRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read_at: n.read_at ?? new Date().toISOString() } : n));
    fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ id }),
    }).catch(() => {});
  };

  const filtered = notifications.filter((n) => {
    if (filter === "all") return true;
    if (filter === "unread") return !n.read_at;
    return FILTER_TYPE_MAP[filter]?.includes(n.type) ?? false;
  });

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 animate-pulse">
            <div className="size-9 rounded-xl bg-muted shrink-0" />
            <div className="flex-1 space-y-2 pt-0.5">
              <div className="h-3 w-3/5 rounded bg-muted" />
              <div className="h-2.5 w-4/5 rounded bg-muted" />
              <div className="h-2 w-1/4 rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold transition",
                filter === f.key
                  ? "bg-primary text-primary-foreground dark:bg-amber-500 dark:text-background"
                  : "bg-muted text-muted-foreground hover:bg-muted/80",
              )}
            >
              {f.label}
              {f.key === "unread" && unreadCount > 0 && (
                <span className="ml-1.5 rounded-full bg-red-500 px-1 text-[9px] font-black text-white">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {unreadCount > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => void markAllRead()}
            disabled={markingAll}
            className="h-8 gap-1.5 text-xs"
          >
            {markingAll
              ? <Loader2 className="size-3.5 animate-spin" />
              : <CheckCheck className="size-3.5" />}
            Đọc tất cả
          </Button>
        )}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card py-16 text-center">
          <Bell className="size-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-semibold text-foreground">
            {filter === "unread" ? "Không có thông báo chưa đọc" : "Không có thông báo nào"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {filter === "unread" ? "Bạn đã đọc hết rồi!" : "Khi có hoạt động mới sẽ hiện ở đây"}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border rounded-2xl border border-border bg-card overflow-hidden">
          {filtered.map((n) => {
            const meta = TYPE_META[n.type] ?? { icon: Bell, color: "text-muted-foreground", label: "Thông báo" };
            const Icon = meta.icon;
            const isUnread = !n.read_at;

            const content = (
              <>
                <div className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-xl border border-border bg-muted",
                  meta.color,
                )}>
                  <Icon className="size-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={cn(
                      "text-sm leading-snug",
                      isUnread ? "font-semibold text-foreground" : "text-foreground/80",
                    )}>
                      {n.title}
                    </p>
                    {isUnread && (
                      <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary dark:bg-amber-400" />
                    )}
                  </div>
                  {n.body && (
                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{n.body}</p>
                  )}
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                      {meta.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{timeAgo(n.created_at)}</span>
                  </div>
                </div>
              </>
            );

            const rowClass = cn(
              "flex items-start gap-3 px-4 py-4 transition-colors hover:bg-muted/30",
              isUnread && "bg-primary/4 dark:bg-amber-400/4",
            );

            return n.entity_url ? (
              <Link
                key={n.id}
                href={n.entity_url}
                className={rowClass}
                onClick={() => { if (isUnread) void markRead(n.id); }}
              >
                {content}
              </Link>
            ) : (
              <div
                key={n.id}
                className={rowClass}
                onClick={() => { if (isUnread) void markRead(n.id); }}
              >
                {content}
              </div>
            );
          })}
        </div>
      )}

      {notifications.length >= 30 && (
        <p className="text-center text-xs text-muted-foreground">
          Chỉ hiển thị 30 thông báo gần nhất
        </p>
      )}
    </div>
  );
}
