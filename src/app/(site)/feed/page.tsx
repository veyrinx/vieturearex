"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Rss, MessageSquare, BookOpen, Loader2, Users, ArrowRight, Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

type FeedItem = {
  type: "forum_post" | "wiki_article";
  id: string;
  title: string;
  excerpt?: string | null;
  category?: string | null;
  cover_url?: string | null;
  url: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
};

const AVATAR_GRADIENTS = [
  "from-blue-500 to-indigo-600", "from-purple-500 to-pink-600",
  "from-amber-500 to-orange-600", "from-green-500 to-emerald-600",
  "from-red-500 to-rose-600", "from-cyan-500 to-teal-600",
];

function getGradient(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_GRADIENTS[Math.abs(h) % AVATAR_GRADIENTS.length];
}

function timeAgo(date: string) {
  const diff = (Date.now() - new Date(date).getTime()) / 1000;
  if (diff < 60) return "vừa xong";
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  if (diff < 7 * 86400) return `${Math.floor(diff / 86400)} ngày trước`;
  return new Date(date).toLocaleDateString("vi-VN");
}

export default function FeedPage() {
  const router = useRouter();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingCount, setFollowingCount] = useState(0);
  const [requiresAuth, setRequiresAuth] = useState(false);

  useEffect(() => {
    fetch("/api/user/feed")
      .then((r) => r.json())
      .then((d: { items?: FeedItem[]; followingCount?: number; requiresAuth?: boolean }) => {
        if (d.requiresAuth) { setRequiresAuth(true); return; }
        setItems(d.items ?? []);
        setFollowingCount(d.followingCount ?? 0);
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  if (requiresAuth) {
    return (
      <div className="mx-auto max-w-2xl py-12 px-4 text-center space-y-4">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 dark:bg-amber-400/10">
          <Rss className="size-7 text-primary dark:text-amber-400" />
        </div>
        <div>
          <h1 className="font-heading text-2xl font-black uppercase tracking-tight">Đăng nhập để xem Feed</h1>
          <p className="mt-2 text-sm text-muted-foreground">Theo dõi bạn bè và xem hoạt động của họ</p>
        </div>
        <button onClick={() => router.push("/login?next=/feed")}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90 transition-opacity">
          Đăng nhập
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl py-8 md:py-12 space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 md:p-8">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-violet-500/5 dark:from-amber-400/6" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        <div className="relative flex items-center gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 dark:bg-amber-400/10">
            <Rss className="size-6 text-primary dark:text-amber-400" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary dark:text-amber-400">Following</p>
            <h1 className="font-heading text-2xl font-black uppercase tracking-tight text-foreground md:text-3xl">
              Feed Của Tôi
            </h1>
            <p className="text-sm text-muted-foreground">
              Hoạt động mới từ {followingCount} người bạn đang theo dõi
            </p>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-4 animate-pulse">
              <div className="flex gap-3">
                <div className="size-10 rounded-full bg-muted shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-1/3 rounded bg-muted" />
                  <div className="h-4 w-4/5 rounded bg-muted" />
                  <div className="h-3 w-2/5 rounded bg-muted" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty: not following anyone */}
      {!loading && followingCount === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center space-y-3">
          <Users className="size-12 mx-auto text-muted-foreground/30" />
          <div>
            <p className="font-bold text-foreground">Bạn chưa follow ai</p>
            <p className="mt-1 text-sm text-muted-foreground">Khám phá và follow để xem hoạt động của họ ở đây</p>
          </div>
          <Link href="/cong-dong/xu-huong"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-bold text-primary-foreground hover:opacity-90 transition-opacity">
            <Users className="size-4" /> Khám phá cộng đồng
          </Link>
        </div>
      )}

      {/* Empty: no activity yet */}
      {!loading && followingCount > 0 && items.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <Clock className="size-10 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-sm font-semibold text-muted-foreground">
            Người bạn theo dõi chưa có hoạt động mới
          </p>
        </div>
      )}

      {/* Feed items */}
      {!loading && items.length > 0 && (
        <div className="space-y-3">
          {items.map((item) => {
            const name = item.display_name ?? "Ẩn danh";
            const initial = name.charAt(0).toUpperCase();
            const gradient = getGradient(item.user_id);
            const isWiki = item.type === "wiki_article";

            return (
              <Link
                key={`${item.type}-${item.id}`}
                href={item.url}
                className={cn(
                  "group block rounded-2xl border border-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-md hover:-translate-y-px",
                  isWiki ? "border-l-4 border-l-emerald-500/50" : "border-l-4 border-l-blue-500/50",
                )}
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <Link href={`/u/${item.user_id}`} onClick={(e) => e.stopPropagation()}
                    className="relative size-10 shrink-0 overflow-hidden rounded-full ring-1 ring-border">
                    {item.avatar_url ? (
                      <Image src={item.avatar_url} alt={name} fill unoptimized className="object-cover" />
                    ) : (
                      <div className={`flex size-full items-center justify-center bg-gradient-to-br ${gradient} text-sm font-black text-white`}>
                        {initial}
                      </div>
                    )}
                  </Link>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    {/* Meta line */}
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                      <Link href={`/u/${item.user_id}`} onClick={(e) => e.stopPropagation()}
                        className="font-bold text-foreground hover:text-primary dark:hover:text-amber-400 transition-colors">
                        {name}
                      </Link>
                      <span className="text-muted-foreground">
                        {isWiki ? "đã đóng góp wiki" : "đã đăng bài"}
                      </span>
                      <span className="text-muted-foreground/40">·</span>
                      <span className="text-muted-foreground">{timeAgo(item.created_at)}</span>
                    </div>

                    {/* Category badge */}
                    {item.category && (
                      <span className={cn(
                        "inline-flex mt-1.5 rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase",
                        isWiki ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-blue-500/10 text-blue-600 dark:text-blue-400",
                      )}>
                        {isWiki ? <BookOpen className="inline size-2.5 mr-0.5" /> : <MessageSquare className="inline size-2.5 mr-0.5" />}
                        {item.category}
                      </span>
                    )}

                    {/* Title */}
                    <h3 className="mt-1.5 font-heading font-bold text-sm text-foreground group-hover:text-primary dark:group-hover:text-amber-400 transition-colors line-clamp-2">
                      {item.title}
                    </h3>

                    {/* Excerpt */}
                    {item.excerpt && (
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{item.excerpt}</p>
                    )}
                  </div>

                  {/* Cover thumb for wiki */}
                  {isWiki && item.cover_url && (
                    <div className="relative size-16 shrink-0 overflow-hidden rounded-lg">
                      <Image src={item.cover_url} alt={item.title} fill unoptimized className="object-cover" />
                    </div>
                  )}

                  <ArrowRight className="size-4 shrink-0 mt-1 text-muted-foreground/40 group-hover:text-primary/60 transition-colors" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
