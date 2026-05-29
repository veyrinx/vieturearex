import Link from "next/link";
import { Clock, Tag } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import type { NewsItem } from "@/lib/types/content";

type NewsSidebarProps = {
  categories: string[];
  recentPosts: NewsItem[];
};

function timeAgo(dateStr: string | null) {
  if (!dateStr) return null;
  try { return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: vi }); } catch { return null; }
}

export function NewsSidebar({ categories, recentPosts }: NewsSidebarProps) {
  return (
    <aside className="space-y-4">
      {/* Categories */}
      {categories.length > 0 && (
        <section className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <Tag className="size-3.5 text-primary dark:text-amber-400" />
            <h3 className="text-[10px] font-black uppercase tracking-[0.24em] text-primary dark:text-amber-400">
              Chuyên mục
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Link
                key={category}
                href={`/news?category=${encodeURIComponent(category)}`}
                className="rounded-full border border-primary/20 bg-primary/8 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-primary transition hover:bg-primary/15 dark:border-amber-400/20 dark:bg-amber-400/8 dark:text-amber-400 dark:hover:bg-amber-400/15"
              >
                {category}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Recent posts */}
      {recentPosts.length > 0 && (
        <section className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <Clock className="size-3.5 text-primary dark:text-amber-400" />
            <h3 className="text-[10px] font-black uppercase tracking-[0.24em] text-primary dark:text-amber-400">
              Bài viết gần đây
            </h3>
          </div>
          <div className="space-y-2">
            {recentPosts.map((post) => {
              const ago = timeAgo(post.created_at);
              return (
                <Link
                  key={post.id}
                  href={`/news/${post.slug}`}
                  className="group flex gap-3 rounded-xl border border-border bg-background/60 p-3 transition hover:border-primary/30 hover:bg-primary/5 dark:hover:border-amber-400/20 dark:hover:bg-amber-400/5"
                >
                  {post.cover && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={post.cover}
                      alt={post.title}
                      className="size-12 shrink-0 rounded-lg object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-[11px] font-bold uppercase leading-snug text-foreground transition-colors group-hover:text-primary dark:group-hover:text-amber-400">
                      {post.title}
                    </p>
                    {ago && (
                      <p className="mt-1 text-[10px] text-muted-foreground">{ago}</p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </aside>
  );
}
