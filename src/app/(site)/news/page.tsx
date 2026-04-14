import type { Metadata } from "next";
import { NewsList } from "@/components/news/news-list";
import { NewsSidebar } from "@/components/news/news-sidebar";
import { SectionHeading } from "@/components/common/section-heading";
import { getNews } from "@/lib/data/content-service";

export const metadata: Metadata = {
  title: "Tin Tức",
  description: "Tin tức Free Fire mới nhất – sự kiện in-game, cập nhật patch, tin Esports và hoạt động cộng đồng Arex. Đọc ngay để không bỏ lỡ.",
};

export const revalidate = 60;

export default async function NewsPage() {
  const news = await getNews("published");
  const categories = Array.from(new Set(news.map((item) => item.category)));

  return (
    <div className="space-y-8 pt-6 md:pt-8">
      <SectionHeading
        title="Tin tức cộng đồng"
        description="Bố cục đồng bộ với phần sự kiện, có lọc ngày đăng và tối ưu SEO cho từng bài viết."
      />
      <div className="grid gap-6 lg:grid-cols-[1fr,300px]">
        <NewsList news={news} />
        <NewsSidebar categories={categories} recentPosts={news.slice(0, 4)} />
      </div>
    </div>
  );
}
