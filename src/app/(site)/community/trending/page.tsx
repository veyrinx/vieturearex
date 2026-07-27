import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/lib/constants/site";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import Image from "next/image";
import { TrendingUp, MessageSquare, FileText, UserPlus, Eye, Reply, ThumbsUp } from "lucide-react";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Xu Hướng Cộng Đồng",
  description: "Hot posts, top contributor và chủ đề được quan tâm trong cộng đồng Arex.",
  alternates: { canonical: `${siteConfig.url}/community/trending` },
  openGraph: {
    title: "Xu Hướng Cộng Đồng | Arex",
    description: "Hot posts, top contributor và chủ đề được quan tâm trong cộng đồng Arex.",
    url: `${siteConfig.url}/community/trending`,
    type: "website",
    siteName: siteConfig.name,
  },
};

type HotPost = {
  id: string;
  title: string;
  category: string;
  display_name: string;
  view_count: number;
  reply_count: number;
  helpful_count: number;
  created_at: string;
};

type Contributor = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  total_points: number;
  posts_count: number;
  wiki_count: number;
  badge: string;
};

type CategoryStat = {
  category: string;
  post_count: number;
};

type NewMember = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
};

const BADGE_LABELS: Record<string, { label: string; cls: string; icon: string }> = {
  member:   { label: "Thành viên",  cls: "bg-muted text-muted-foreground",                          icon: "👤" },
  regular:  { label: "Thường xuyên", cls: "bg-blue-500/15 text-blue-600 dark:text-blue-400",        icon: "✨" },
  veteran:  { label: "Kỳ cựu",      cls: "bg-green-500/15 text-green-600 dark:text-green-400",      icon: "🌿" },
  expert:   { label: "Chuyên gia",  cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400",      icon: "⭐" },
  legend:   { label: "Huyền Thoại", cls: "bg-purple-500/15 text-purple-600 dark:text-purple-400",   icon: "👑" },
};

const CATEGORY_COLORS: Record<string, string> = {
  "Hướng dẫn":  "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  "Thảo luận":  "bg-purple-500/15 text-purple-600 dark:text-purple-400",
  "Sự kiện":    "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  "Tin tức":    "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  "Clip & Video": "bg-red-500/15 text-red-600 dark:text-red-400",
  "Tìm clan":   "bg-pink-500/15 text-pink-600 dark:text-pink-400",
};

function getCatColor(cat: string) {
  return CATEGORY_COLORS[cat] ?? "bg-muted text-muted-foreground";
}

function Avatar({ src, name, size = "md" }: { src?: string | null; name?: string | null; size?: "sm" | "md" }) {
  const px = size === "sm" ? 32 : 40;
  const sz = size === "sm" ? "size-8" : "size-10";
  if (src) {
    return <Image src={src} alt={name ?? ""} width={px} height={px} unoptimized className={`${sz} rounded-full object-cover`} />;
  }
  return (
    <span className={`${sz} flex items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary dark:bg-amber-400/15 dark:text-amber-400`}>
      {(name ?? "?")[0]?.toUpperCase()}
    </span>
  );
}

export default async function TrendsPage() {
  const db = createAdminSupabaseClient();

  const sevenDaysAgo  = new Date(Date.now() - 7  * 86_400_000).toISOString();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();

  let hotPosts:       HotPost[]      = [];
  let topContribs:    Contributor[]  = [];
  let categoryStats:  CategoryStat[] = [];
  let newMembers:     NewMember[]    = [];
  let totalPosts    = 0;
  let totalReplies  = 0;
  let totalWiki     = 0;
  let newThisWeek   = 0;

  if (db) {
    const [hotRes, contribRes, catRawRes, membersRes, totalPostsRes, totalRepliesRes, totalWikiRes] =
      await Promise.all([
        untypedFrom(db, "forum_posts")
          .select("id, title, category, display_name, view_count, reply_count, helpful_count, created_at")
          .eq("status", "active")
          .gte("created_at", sevenDaysAgo)
          .limit(50) as unknown as Promise<{ data: HotPost[] | null }>,

        untypedFrom(db, "contributor_points")
          .select("user_id, display_name, avatar_url, total_points, posts_count, wiki_count, badge")
          .order("total_points", { ascending: false })
          .limit(10) as unknown as Promise<{ data: Contributor[] | null }>,

        untypedFrom(db, "forum_posts")
          .select("category")
          .eq("status", "active")
          .gte("created_at", thirtyDaysAgo) as unknown as Promise<{ data: { category: string }[] | null }>,

        untypedFrom(db, "users")
          .select("id, display_name, avatar_url, created_at")
          .gte("created_at", sevenDaysAgo)
          .order("created_at", { ascending: false })
          .limit(6) as unknown as Promise<{ data: NewMember[] | null }>,

        untypedFrom(db, "forum_posts")
          .select("*", { count: "exact", head: true })
          .eq("status", "active") as unknown as Promise<{ count: number | null }>,

        untypedFrom(db, "forum_replies")
          .select("*", { count: "exact", head: true })
          .eq("status", "active") as unknown as Promise<{ count: number | null }>,

        untypedFrom(db, "wiki_articles")
          .select("*", { count: "exact", head: true })
          .eq("status", "published") as unknown as Promise<{ count: number | null }>,
      ]);

    hotPosts = (hotRes.data ?? [])
      .map((p) => ({ ...p, _score: p.view_count + p.reply_count * 2 + p.helpful_count * 3 }))
      .sort((a: HotPost & { _score: number }, b: HotPost & { _score: number }) => b._score - a._score)
      .slice(0, 8);

    topContribs = contribRes.data ?? [];
    newMembers  = membersRes.data ?? [];
    newThisWeek = newMembers.length;

    // Build category stats
    const catMap = new Map<string, number>();
    for (const row of catRawRes.data ?? []) {
      catMap.set(row.category, (catMap.get(row.category) ?? 0) + 1);
    }
    categoryStats = [...catMap.entries()]
      .map(([category, post_count]) => ({ category, post_count }))
      .sort((a, b) => b.post_count - a.post_count)
      .slice(0, 8);

    totalPosts   = totalPostsRes.count   ?? 0;
    totalReplies = totalRepliesRes.count ?? 0;
    totalWiki    = totalWikiRes.count    ?? 0;
  }

  const maxCatCount = categoryStats[0]?.post_count ?? 1;

  return (
    <div className="mx-auto max-w-5xl py-8 md:py-12 space-y-10">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-7 md:p-10">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-transparent dark:from-amber-400/6" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
        <div className="relative space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary dark:text-amber-400">Arex Community</p>
          <h1 className="font-heading text-3xl font-black uppercase tracking-tight text-foreground md:text-4xl">
            Xu Hướng Cộng Đồng
          </h1>
          <p className="text-sm text-muted-foreground">Hot posts, top contributor và các chủ đề nổi bật</p>
        </div>

        {/* Stats row */}
        <div className="relative mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { icon: MessageSquare, label: "Bài viết",  value: totalPosts,   color: "text-blue-500" },
            { icon: Reply,         label: "Trả lời",   value: totalReplies, color: "text-purple-500" },
            { icon: FileText,      label: "Wiki",       value: totalWiki,    color: "text-emerald-500" },
            { icon: UserPlus,      label: "TV mới/tuần", value: newThisWeek, color: "text-pink-500" },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="flex flex-col gap-0.5 rounded-2xl border border-border bg-background/60 p-3 backdrop-blur-sm">
              <Icon className={`size-4 ${color}`} />
              <span className="font-heading text-xl font-black text-foreground">{value.toLocaleString()}</span>
              <span className="text-[10px] text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Hot Posts */}
      <section className="space-y-4">
        <div className="flex items-center gap-2.5">
          <span className="h-px w-6 bg-gradient-to-r from-orange-500 to-orange-500/60" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-500">Hot</span>
          <span className="h-px flex-1 bg-gradient-to-r from-orange-500/30 to-transparent" />
        </div>
        <h2 className="font-heading text-2xl font-black uppercase tracking-tight text-foreground -mt-1">
          Bài Viết Hot Tuần Này
        </h2>
        {hotPosts.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
            Chưa có bài viết hot trong tuần này
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {hotPosts.map((post, idx) => (
              <Link
                key={post.id}
                href={`/community/${post.id}`}
                className="group flex gap-3 rounded-2xl border border-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-md hover:-translate-y-px dark:hover:border-amber-400/20"
              >
                <span className={`shrink-0 mt-0.5 font-heading text-2xl font-black leading-none tabular-nums ${
                  idx === 0 ? "text-amber-400" : idx === 1 ? "text-zinc-400" : idx === 2 ? "text-orange-500" : "text-muted-foreground/40"
                }`}>
                  {idx < 3 ? ["🥇","🥈","🥉"][idx] : `${idx + 1}`}
                </span>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <span className={`inline-flex rounded-md px-2 py-0.5 text-[9px] font-bold ${getCatColor(post.category)}`}>
                    {post.category}
                  </span>
                  <h3 className="line-clamp-2 text-sm font-bold leading-snug text-foreground group-hover:text-primary dark:group-hover:text-amber-400 transition-colors">
                    {post.title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="font-semibold text-foreground/70">{post.display_name}</span>
                    <span className="flex items-center gap-1"><Eye className="size-3" />{post.view_count.toLocaleString()}</span>
                    <span className="flex items-center gap-1"><Reply className="size-3" />{post.reply_count}</span>
                    {post.helpful_count > 0 && <span className="flex items-center gap-1 text-emerald-500"><ThumbsUp className="size-3" />{post.helpful_count}</span>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Top Contributors */}
        <section className="space-y-4">
          <h2 className="font-heading text-xl font-black uppercase tracking-tight text-foreground">
            🏆 Top Contributor
          </h2>
          {topContribs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border py-8 text-center">
              <p className="text-sm text-muted-foreground">Cộng đồng đang xây dựng</p>
            </div>
          ) : (
            <div className="space-y-2">
              {topContribs.map((c, i) => {
                const badge = BADGE_LABELS[c.badge] ?? BADGE_LABELS.member;
                return (
                  <div key={c.user_id} className={`flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:border-primary/30 dark:hover:border-amber-400/20 ${i < 3 ? "border-primary/20 dark:border-amber-400/15" : "border-border"}`}>
                    <span className="w-6 shrink-0 text-center text-base leading-none">
                      {i < 3 ? ["🥇","🥈","🥉"][i] : <span className="text-xs font-black text-muted-foreground">{i + 1}</span>}
                    </span>
                    <Avatar src={c.avatar_url} name={c.display_name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{c.display_name ?? "Ẩn danh"}</p>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.cls}`}>
                        {badge.icon} {badge.label}
                      </span>
                    </div>
                    <span className="shrink-0 text-sm font-black tabular-nums text-primary dark:text-amber-400">
                      {c.total_points.toLocaleString()}đ
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Category stats */}
        <section className="space-y-4">
          <h2 className="font-heading text-xl font-black uppercase tracking-tight text-foreground">
            📊 Chủ Đề Được Quan Tâm
          </h2>
          {categoryStats.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border py-8 text-center">
              <p className="text-sm text-muted-foreground">Chưa có dữ liệu</p>
            </div>
          ) : (
            <div className="space-y-3">
              {categoryStats.map((cat) => {
                const pct = Math.round((cat.post_count / maxCatCount) * 100);
                return (
                  <div key={cat.category} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className={`rounded-full px-2 py-0.5 font-semibold ${getCatColor(cat.category)}`}>
                        {cat.category}
                      </span>
                      <span className="font-bold tabular-nums text-muted-foreground">
                        {cat.post_count} bài
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70 dark:from-amber-400 dark:to-amber-400/70 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* New members */}
      {newMembers.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-heading text-xl font-black uppercase tracking-tight text-foreground">
            👋 Thành Viên Mới
          </h2>
          <div className="flex flex-wrap gap-3">
            {newMembers.map((m) => (
              <Link
                key={m.id}
                href={`/u/${m.id}`}
                className="flex items-center gap-2.5 rounded-2xl border border-border bg-card px-3 py-2.5 transition-colors hover:border-primary/30 hover:bg-muted/50 dark:hover:border-amber-400/20"
              >
                <Avatar src={m.avatar_url} name={m.display_name} size="sm" />
                <div>
                  <p className="text-sm font-bold">{m.display_name ?? "Ẩn danh"}</p>
                  <p className="text-[10px] text-muted-foreground">
                    Tham gia {new Date(m.created_at).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
