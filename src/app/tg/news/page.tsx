import Link from "next/link";
import { getNews } from "@/lib/data/content-service";
import type { NewsItem } from "@/lib/types/content";
import { siteConfig } from "@/lib/constants/site";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

function NewsCard({ item }: { item: NewsItem }) {
  const timeAgo = formatDistanceToNow(new Date(item.created_at), {
    addSuffix: true,
    locale: vi,
  });

  return (
    <a
      href={`${siteConfig.url}/news/${item.slug}`}
      target="_blank"
      rel="noopener noreferrer"
      className="flex gap-3 p-3 rounded-2xl active:opacity-70 transition-opacity"
      style={{ backgroundColor: "var(--tg-theme-secondary-bg-color, #111)" }}
    >
      {item.cover && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.cover}
          alt={item.title}
          className="w-20 h-16 rounded-xl object-cover shrink-0"
        />
      )}
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <p className="text-sm font-semibold line-clamp-2 leading-snug">{item.title}</p>
        <div className="flex items-center gap-2 mt-1">
          <span
            className="text-[10px] px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: "var(--tg-theme-button-color, #f97316)",
              color: "var(--tg-theme-button-text-color, #fff)",
              opacity: 0.9,
            }}
          >
            {item.category}
          </span>
          <span
            className="text-[10px]"
            style={{ color: "var(--tg-theme-hint-color, #888)" }}
          >
            {timeAgo}
          </span>
        </div>
      </div>
    </a>
  );
}

export default async function TgNewsPage() {
  const news = await getNews("published");
  const latest = news.slice(0, 30);

  return (
    <div className="flex flex-col gap-3 p-4">
      <h1 className="font-bold text-base">Tin tức mới nhất</h1>
      {latest.length === 0 ? (
        <p style={{ color: "var(--tg-theme-hint-color, #888)" }} className="text-sm text-center py-10">
          Chưa có tin tức nào.
        </p>
      ) : (
        latest.map((item) => <NewsCard key={item.id} item={item} />)
      )}
      <Link
        href={`${siteConfig.url}/news`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-center text-xs py-3 rounded-xl"
        style={{ color: "var(--tg-theme-link-color, #f97316)" }}
      >
        Xem tất cả trên web →
      </Link>
    </div>
  );
}
