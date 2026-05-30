import type { Metadata } from "next";
import { siteConfig } from "@/lib/constants/site";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import { ForumList, CreatePostButton } from "@/components/forum/forum-client";
import { MessageSquare, Users, TrendingUp } from "lucide-react";

export const metadata: Metadata = {
  title: "Cộng Đồng — Diễn Đàn Free Fire | Arex",
  description: "Diễn đàn cộng đồng Free Fire Việt Nam. Thảo luận, chia sẻ hướng dẫn, tìm clan và cập nhật sự kiện cùng hàng nghìn người chơi.",
  alternates: { canonical: `${siteConfig.url}/cong-dong` },
  openGraph: {
    title: "Cộng Đồng Free Fire — Arex",
    description: "Diễn đàn thảo luận Free Fire: hướng dẫn, sự kiện, clan & team, tin tức mới nhất từ cộng đồng.",
    url: `${siteConfig.url}/cong-dong`,
    type: "website",
  },
};

export const revalidate = 30;

async function getForumStats() {
  const db = createAdminSupabaseClient();
  if (!db) return { totalPosts: 0, totalReplies: 0, activeToday: 0 };
  const [{ count: totalPosts }, { count: totalReplies }] = await Promise.all([
    untypedFrom(db, "forum_posts").select("*", { count: "exact", head: true }).eq("status", "active") as Promise<{ count: number | null }>,
    untypedFrom(db, "forum_replies").select("*", { count: "exact", head: true }).eq("status", "active") as Promise<{ count: number | null }>,
  ]);
  const yesterday = new Date(Date.now() - 86_400_000).toISOString();
  const { count: activeToday } = await untypedFrom(db, "forum_posts")
    .select("*", { count: "exact", head: true })
    .eq("status", "active")
    .gte("created_at", yesterday) as { count: number | null };
  return { totalPosts: totalPosts ?? 0, totalReplies: totalReplies ?? 0, activeToday: activeToday ?? 0 };
}

async function getInitialPosts() {
  const db = createAdminSupabaseClient();
  if (!db) return { posts: [], total: 0 };
  const { data, count } = await untypedFrom(db, "forum_posts")
    .select("id, title, category, display_name, avatar_url, view_count, reply_count, is_pinned, is_locked, created_at, updated_at", { count: "exact" })
    .eq("status", "active")
    .order("is_pinned", { ascending: false })
    .order("updated_at", { ascending: false })
    .range(0, 19) as { data: unknown[] | null; count: number | null };
  return { posts: (data ?? []) as Parameters<typeof ForumList>[0]["initialPosts"], total: count ?? 0 };
}

export default async function ForumPage() {
  const [stats, { posts, total }] = await Promise.all([getForumStats(), getInitialPosts()]);

  return (
    <div className="mx-auto max-w-4xl py-8 md:py-12 space-y-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-7 md:p-10">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-transparent dark:from-amber-400/6" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary dark:text-amber-400">Arex Community</p>
            <h1 className="font-heading text-3xl font-black uppercase tracking-tight text-foreground md:text-4xl">Diễn Đàn</h1>
            <p className="text-sm text-muted-foreground">Thảo luận, chia sẻ, kết nối cùng cộng đồng Free Fire</p>
          </div>
          <CreatePostButton />
        </div>
        {/* Stats */}
        <div className="relative mt-6 flex flex-wrap gap-4">
          {[
            { icon: MessageSquare, label: "Bài viết", value: stats.totalPosts },
            { icon: Users,         label: "Trả lời",  value: stats.totalReplies },
            { icon: TrendingUp,    label: "Hôm nay",  value: stats.activeToday },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-2 rounded-full border border-border bg-background/60 px-4 py-1.5 backdrop-blur-sm">
              <Icon className="size-3.5 text-primary dark:text-amber-400" />
              <span className="font-heading text-sm font-black text-primary dark:text-amber-400">{value.toLocaleString()}</span>
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </div>

      <ForumList initialPosts={posts} initialTotal={total} />
    </div>
  );
}
