import Link from "next/link";
import type { NewsItem } from "@/lib/types/content";

type NewsSidebarProps = {
  categories: string[];
  recentPosts: NewsItem[];
};

export function NewsSidebar({ categories, recentPosts }: NewsSidebarProps) {
  return (
    <aside className="space-y-4">
      <section className="glass-card rounded-2xl p-4">
        <h3 className="font-heading text-base font-semibold text-foreground">Category</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {categories.map((category) => (
            <span
              key={category}
              className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary"
            >
              {category}
            </span>
          ))}
        </div>
      </section>
      <section className="glass-card rounded-2xl p-4">
        <h3 className="font-heading text-base font-semibold text-foreground">Recent Posts</h3>
        <div className="mt-3 space-y-3">
          {recentPosts.map((post) => (
            <Link
              key={post.id}
              href={`/news/${post.slug}`}
              className="block rounded-xl border border-border bg-background/80 px-3 py-2 text-sm text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
            >
              {post.title}
            </Link>
          ))}
        </div>
      </section>
    </aside>
  );
}



