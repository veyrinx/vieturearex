import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { ProgressSummary, ReadMark } from "@/components/craftland/academy-client";
import { PlatformTag } from "@/components/craftland/platform-tag";
import { getAcademyCategories, listPublishedArticles } from "@/lib/server/craftland-academy";
import { CRAFTLAND_ACADEMY, craftlandAcademyHref } from "@/lib/constants/craftland";
import { siteConfig } from "@/lib/constants/site";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Craftland Academy — Hướng dẫn làm map Free Fire",
  description: "Trung tâm hướng dẫn tiếng Việt cho Craftland Mobile và Craftland Studio PC: scripting, API, HUD, tối ưu và xuất bản bản đồ.",
  alternates: { canonical: `${siteConfig.url}${CRAFTLAND_ACADEMY}` },
};

export default async function AcademyIndexPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = (await searchParams).q?.slice(0, 60);
  const [categories, articles] = await Promise.all([getAcademyCategories(), listPublishedArticles(q)]);
  const byCategory = new Map<string, typeof articles>();
  for (const a of articles) byCategory.set(a.category_slug, [...(byCategory.get(a.category_slug) ?? []), a]);

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <h1 className="font-heading text-2xl font-bold md:text-3xl">Craftland Academy</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Hướng dẫn do ArexNetwork biên soạn bằng tiếng Việt, có ví dụ riêng và dẫn nguồn tài liệu chính thức của Garena ở từng bài. Nội dung tham khảo — khi có khác biệt, tài liệu chính thức là chuẩn.
        </p>
        <form role="search" className="relative max-w-xl">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            name="q"
            type="search"
            defaultValue={q}
            maxLength={60}
            placeholder="Tìm trong toàn bộ bài hướng dẫn…"
            aria-label="Tìm bài hướng dẫn"
            className="h-11 w-full rounded-xl border border-input bg-card pl-10 pr-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </form>
      </header>

      <Link href={`${CRAFTLAND_ACADEMY}/api`} className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 transition hover:border-primary/40">
        <span>
          <span className="block font-semibold">Tra cứu API, module, sự kiện & kiểu dữ liệu</span>
          <span className="block text-sm text-muted-foreground">Chữ ký hàm, kiểu tham số, đánh dấu API hết hạn — link thẳng tới tài liệu chính thức.</span>
        </span>
        <span className="shrink-0 text-sm font-semibold text-primary">Mở →</span>
      </Link>

      {!q && <ProgressSummary articleIds={articles.map((a) => a.id)} />}

      {q && (
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {articles.length} kết quả cho “{q}” · <Link href={CRAFTLAND_ACADEMY} className="text-primary hover:underline">Xem tất cả</Link>
        </p>
      )}

      {articles.length === 0 && (
        <p className="rounded-xl border border-dashed border-border bg-card/50 px-6 py-10 text-center text-sm text-muted-foreground">
          {q ? "Không tìm thấy bài viết phù hợp." : "Đội ngũ đang biên soạn những bài hướng dẫn đầu tiên. Quay lại sau nhé!"}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {categories
          .filter((c) => (byCategory.get(c.slug)?.length ?? 0) > 0)
          .map((c) => (
            <section key={c.slug} id={c.slug} className="rounded-2xl border border-border bg-card p-5">
              <h2 className="font-heading text-base font-bold">{c.name}</h2>
              {c.description && <p className="mt-1 text-sm text-muted-foreground">{c.description}</p>}
              <ul className="mt-3 space-y-1">
                {byCategory.get(c.slug)!.map((a) => (
                  <li key={a.id}>
                    <Link href={craftlandAcademyHref(a.slug)} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition hover:bg-muted">
                      <ReadMark articleId={a.id} />
                      <span className="flex-1">{a.title}</span>
                      <PlatformTag platform={a.platform} />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
      </div>
    </div>
  );
}
