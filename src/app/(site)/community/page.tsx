import type { Metadata } from "next";
import { siteConfig } from "@/lib/constants/site";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import { ForumList, CreatePostButton } from "@/components/forum/forum-client";
import { fetchCosmetics } from "@/lib/server/forum-cosmetics";
import { WeeklyVoteSection } from "@/components/community/weekly-vote-section";
import Link from "next/link";
import { MessageSquare, Users, TrendingUp, Trophy, Phone, ShieldAlert, ArrowRight, Target } from "lucide-react";

export const metadata: Metadata = {
  title: "Cộng Đồng — Diễn Đàn Free Fire",
  description: "Diễn đàn cộng đồng Free Fire Việt Nam. Thảo luận, chia sẻ hướng dẫn, tìm clan và cập nhật sự kiện cùng hàng nghìn người chơi.",
  alternates: { canonical: `${siteConfig.url}/community` },
  openGraph: {
    title: "Cộng Đồng Free Fire — Arex",
    description: "Diễn đàn thảo luận Free Fire: hướng dẫn, sự kiện, clan & team, tin tức mới nhất từ cộng đồng.",
    url: `${siteConfig.url}/community`,
    type: "website",
  },
};

export const revalidate = 30;

async function getForumStats() {
  const db = createAdminSupabaseClient();
  if (!db) return { totalPosts: 0, totalReplies: 0, activeToday: 0 };
  const [postsRes, repliesRes] = await Promise.all([
    untypedFrom(db, "forum_posts").select("*", { count: "exact", head: true }).eq("status", "active") as unknown as Promise<{ count: number | null }>,
    untypedFrom(db, "forum_replies").select("*", { count: "exact", head: true }).eq("status", "active") as unknown as Promise<{ count: number | null }>,
  ]);
  return {
    totalPosts:   postsRes.count   ?? 0,
    totalReplies: repliesRes.count ?? 0,
    activeToday:  Math.max(12, Math.floor((postsRes.count ?? 0) * 0.15)),
  };
}

export default async function CommunityPage() {
  const [stats, { posts, total }] = await Promise.all([
    getForumStats(),
    (async () => {
      const db = createAdminSupabaseClient();
      if (!db) return { posts: [], total: 0 };
      const { data, count } = await untypedFrom(db, "forum_posts")
        .select("id, title, category, author_id, author_name, created_at, likes_count, replies_count, view_count, is_pinned, is_locked", { count: "exact" })
        .eq("status", "active")
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false })
      const rawPosts = data || [];
      const userIds = rawPosts.map((p: any) => p.author_id).filter((id: any): id is string => Boolean(id));
      const cosmeticsMap = await fetchCosmetics(db, userIds);
      const formatted = rawPosts.map((p: any) => {
        const c = p.author_id ? cosmeticsMap.get(p.author_id) : undefined;
        return {
          id: p.id,
          title: p.title,
          category: p.category,
          author_id: p.author_id,
          author_name: p.author_name || "Ẩn danh",
          created_at: p.created_at,
          likes_count: p.likes_count ?? 0,
          replies_count: p.replies_count ?? 0,
          view_count: p.view_count ?? 0,
          is_pinned: p.is_pinned ?? false,
          is_locked: p.is_locked ?? false,
          css_ring: c?.css_ring ?? null,
          user_title: c?.title ?? null,
          user_title_color: c?.title_color ?? null,
          role: c?.role ?? null,
          is_verified: c?.is_verified ?? false,
        };
      });
      return { posts: formatted as unknown as Parameters<typeof ForumList>[0]["initialPosts"], total: count ?? 0 };
    })(),
  ]);

  return (
    <div className="mx-auto max-w-6xl py-8 md:py-12 space-y-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 md:p-10 shadow-lg">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-amber-500/5 dark:from-amber-400/10" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary dark:text-amber-400">Diễn Đàn Cộng Đồng · Arex</p>
            <h1 className="font-heading text-3xl font-black uppercase tracking-tight text-foreground md:text-4xl">
              Cộng Đồng <span className="text-primary dark:text-amber-400">Free Fire</span>
            </h1>
            <p className="max-w-xl text-sm font-medium text-muted-foreground">
              Nơi giao lưu, thảo luận chiến thuật, chia sẻ kinh nghiệm và kết nối với hàng nghìn game thủ Free Fire Việt Nam.
            </p>
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

      {/* Community Utilities Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Check Scam Banner */}
        <Link
          href="/check-scam"
          className="group flex items-center justify-between gap-4 rounded-3xl border border-rose-900/50 bg-gradient-to-r from-rose-950/50 via-card to-card p-5 shadow-md transition hover:border-rose-500/50 hover:shadow-rose-950/20"
        >
          <div className="flex items-center gap-3.5">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 group-hover:scale-105 transition-transform">
              <ShieldAlert className="size-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-rose-600/90 px-2 py-0.5 text-[9px] font-black uppercase text-white tracking-wider">
                  MỚI
                </span>
                <h3 className="font-heading text-sm font-black uppercase tracking-tight text-foreground group-hover:text-rose-400 transition-colors">
                  Check Scam Lừa Đảo
                </h3>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Tra SĐT, số tài khoản, UID game trong hồ sơ rủi ro của chợ Arex.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center justify-center px-3 py-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 text-[11px] font-bold shrink-0">
            Tra ngay
          </span>
        </Link>

        {/* Phone Lookup VietNam Tool Banner */}
        <Link
          href="/phone-lookup"
          className="group flex items-center justify-between gap-4 rounded-3xl border border-cyan-900/50 bg-gradient-to-r from-cyan-950/40 via-card to-card p-5 shadow-md transition hover:border-cyan-500/50 hover:shadow-cyan-950/20"
        >
          <div className="flex items-center gap-3.5">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 group-hover:scale-105 transition-transform">
              <Phone className="size-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-cyan-500/20 px-2 py-0.5 text-[9px] font-black uppercase text-cyan-300">
                  MỚI
                </span>
                <h3 className="font-heading text-sm font-black uppercase tracking-tight text-foreground group-hover:text-cyan-400 transition-colors">
                  Phone Lookup VietNam
                </h3>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Tra cứu SĐT Việt Nam (đầu 84), nhà mạng, định dạng & RAW.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center justify-center size-8 rounded-full border border-cyan-800/60 bg-cyan-950/50 text-cyan-300 transition group-hover:bg-cyan-900/60 group-hover:text-white shrink-0">
            <ArrowRight className="size-4 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </Link>

        {/* Nhiệm vụ tuần */}
        <Link
          href="/nhiem-vu"
          className="group flex items-center justify-between gap-4 rounded-3xl border border-emerald-900/50 bg-gradient-to-r from-emerald-950/40 via-card to-card p-5 shadow-md transition hover:border-emerald-500/50 hover:shadow-emerald-950/20"
        >
          <div className="flex items-center gap-3.5">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 group-hover:scale-105 transition-transform">
              <Target className="size-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-[9px] font-black uppercase text-emerald-300">
                  MỚI
                </span>
                <h3 className="font-heading text-sm font-black uppercase tracking-tight text-foreground group-hover:text-emerald-400 transition-colors">
                  Nhiệm Vụ Tuần
                </h3>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Đăng bài, bình luận, đóng góp wiki — nhận điểm đóng góp mỗi tuần.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center justify-center size-8 rounded-full border border-emerald-800/60 bg-emerald-950/50 text-emerald-300 transition group-hover:bg-emerald-900/60 group-hover:text-white shrink-0">
            <ArrowRight className="size-4 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </Link>
      </div>

      <ForumList initialPosts={posts} initialTotal={total} />

      {/* Weekly Best Post Voting */}
      <section className="rounded-3xl border border-border bg-card p-6 md:p-8 space-y-5">
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 dark:bg-amber-400/15">
            <Trophy className="size-4 text-primary dark:text-amber-400" />
          </span>
          <div>
            <h2 className="font-heading text-lg font-black uppercase tracking-tight text-foreground">
              🏆 Bình Chọn Bài Hay Nhất Tuần
            </h2>
            <p className="text-xs text-muted-foreground">Mỗi tuần mỗi người được 1 phiếu bình chọn</p>
          </div>
        </div>
        <WeeklyVoteSection />
      </section>
    </div>
  );
}
