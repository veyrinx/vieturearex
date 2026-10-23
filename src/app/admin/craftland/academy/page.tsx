import type { Metadata } from "next";
import Link from "next/link";
import { GraduationCap, Plus } from "lucide-react";
import { requireAdminCapability } from "@/lib/server/admin-access";
import { tbl } from "@/lib/server/craftland";
import { getAcademyCategories } from "@/lib/server/craftland-academy";
import { craftlandAcademyHref } from "@/lib/constants/craftland";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Craftland Academy" };

const STATUS = { draft: "Nháp", published: "Đã xuất bản", archived: "Lưu trữ" } as const;
const dt = new Intl.DateTimeFormat("vi-VN", { dateStyle: "short" });

export default async function AdminAcademyPage() {
  await requireAdminCapability("craftland.content");
  const [categories, res] = await Promise.all([
    getAcademyCategories(),
    tbl("craftland_academy_articles").select("id, slug, title, category_slug, status, platform, sort_order, updated_at, sources")
      .order("category_slug").order("sort_order").limit(1000) as unknown as Promise<{
      data: Array<{ id: string; slug: string; title: string; category_slug: string; status: keyof typeof STATUS; platform: string; sort_order: number; updated_at: string; sources: unknown[] }> | null;
    }>,
  ]);
  const articles = res.data ?? [];
  const catName = new Map(categories.map((c) => [c.slug, c.name]));

  return (
    <div className="space-y-6 text-foreground">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <h1 className="flex items-center gap-2 font-heading text-xl font-bold"><GraduationCap className="size-5 text-primary" aria-hidden /> Craftland Academy</h1>
          <p className="mt-1 text-sm text-muted-foreground">Bài hướng dẫn do ArexNetwork biên soạn. Dẫn nguồn tài liệu chính thức, không sao chép nguyên văn.</p>
        </div>
        <Link href="/admin/craftland/academy/new" className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground">
          <Plus className="size-4" aria-hidden /> Bài mới
        </Link>
      </div>
      {articles.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground">Chưa có bài viết. {categories.length} danh mục đã sẵn sàng.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
              <tr><th className="px-4 py-2 font-medium">Bài viết</th><th className="px-3 py-2 font-medium">Danh mục</th><th className="px-3 py-2 font-medium">Trạng thái</th><th className="px-4 py-2 font-medium">Cập nhật</th></tr>
            </thead>
            <tbody>
              {articles.map((a) => (
                <tr key={a.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5">
                    <Link href={`/admin/craftland/academy/${a.id}`} className="font-medium hover:text-primary">{a.title}</Link>
                    {a.status === "published" && <Link href={craftlandAcademyHref(a.slug)} target="_blank" className="ml-2 text-xs text-primary hover:underline">xem</Link>}
                    {a.sources.length === 0 && <span className="ml-2 text-xs text-amber-600">chưa có nguồn</span>}
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">{catName.get(a.category_slug) ?? a.category_slug}</td>
                  <td className="px-3 py-2.5"><span className={cn("rounded px-1.5 py-0.5 text-[11px] font-semibold", a.status === "published" ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground")}>{STATUS[a.status]}</span></td>
                  <td className="px-4 py-2.5 text-muted-foreground">{dt.format(new Date(a.updated_at))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
