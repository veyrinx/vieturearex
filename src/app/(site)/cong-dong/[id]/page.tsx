import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Eye, MessageSquare, Pin, Lock, Clock } from "lucide-react";
import { siteConfig } from "@/lib/constants/site";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import { ForumReplies } from "@/components/forum/forum-client";

type Post = {
  id: string; title: string; content: string; category: string;
  display_name: string; avatar_url: string | null;
  view_count: number; reply_count: number;
  is_pinned: boolean; is_locked: boolean;
  created_at: string;
};

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const db = createAdminSupabaseClient();
  if (!db) return { title: "Diễn đàn" };
  const { data } = await untypedFrom(db, "forum_posts")
    .select("title, content").eq("id", id).eq("status", "active").single() as
    { data: { title: string; content: string } | null };
  if (!data) return { title: "Không tìm thấy bài viết" };
  return {
    title: `${data.title} — Diễn đàn Arex`,
    description: data.content.slice(0, 160),
    alternates: { canonical: `${siteConfig.url}/cong-dong/${id}` },
    openGraph: { title: data.title, description: data.content.slice(0, 160), type: "article" },
  };
}

export const revalidate = 60;

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "vừa xong";
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  return new Date(iso).toLocaleDateString("vi-VN");
}

export default async function ForumPostPage({ params }: Props) {
  const { id } = await params;
  const db = createAdminSupabaseClient();
  if (!db) notFound();

  const { data: post } = await untypedFrom(db, "forum_posts")
    .select("*").eq("id", id).eq("status", "active").single() as { data: Post | null };
  if (!post) notFound();

  const initial = post.display_name.charAt(0).toUpperCase();
  const gradients = ["from-blue-500 to-indigo-600","from-purple-500 to-pink-600","from-amber-500 to-orange-600","from-emerald-500 to-teal-600"];
  const gradient = gradients[post.display_name.charCodeAt(0) % gradients.length];

  return (
    <div className="mx-auto max-w-3xl py-8 md:py-12 space-y-6">
      {/* Back */}
      <Link href="/cong-dong" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="size-4" /> Diễn đàn
      </Link>

      {/* Post */}
      <article className="rounded-2xl border border-border bg-card overflow-hidden">
        {/* Header */}
        <div className="border-b border-border p-5 md:p-6 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {post.is_pinned && <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-primary dark:text-amber-400"><Pin className="size-2.5" />Ghim</span>}
            {post.is_locked && <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[10px] font-bold text-muted-foreground"><Lock className="size-2.5" />Đóng</span>}
            <span className="rounded-full border border-border px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">{post.category}</span>
          </div>
          <h1 className="font-heading text-xl font-black uppercase leading-snug tracking-[0.02em] text-foreground md:text-2xl">{post.title}</h1>
          <div className="flex items-center gap-3">
            {post.avatar_url ? (
              <img src={post.avatar_url} alt={post.display_name} className="size-9 rounded-full object-cover" />
            ) : (
              <div className={`size-9 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-xs font-black text-white`}>{initial}</div>
            )}
            <div>
              <p className="text-sm font-semibold text-foreground">{post.display_name}</p>
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="size-3" />{timeAgo(post.created_at)}</span>
                <span className="flex items-center gap-1"><Eye className="size-3" />{post.view_count}</span>
                <span className="flex items-center gap-1"><MessageSquare className="size-3" />{post.reply_count}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 md:p-6">
          <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap leading-relaxed text-foreground/90">
            {post.content}
          </div>
        </div>
      </article>

      {/* Replies */}
      <div className="rounded-2xl border border-border bg-card p-5 md:p-6">
        <ForumReplies postId={post.id} isLocked={post.is_locked} />
      </div>
    </div>
  );
}
