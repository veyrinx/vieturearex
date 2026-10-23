import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AcademyEditor, AuditButton } from "@/components/craftland/admin-panels";
import { requireAdminCapability } from "@/lib/server/admin-access";
import { tbl } from "@/lib/server/craftland";
import { getAcademyCategories } from "@/lib/server/craftland-academy";
import type { CraftlandAcademyArticle } from "@/lib/types/craftland";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sửa bài Academy" };

export default async function EditAcademyArticlePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminCapability("craftland.content");
  const { id } = await params;
  const [categories, { data: article }] = await Promise.all([
    getAcademyCategories(),
    tbl("craftland_academy_articles").select("*").eq("id", id).maybeSingle() as unknown as Promise<{ data: CraftlandAcademyArticle | null }>,
  ]);
  if (!article) notFound();
  return (
    <div className="space-y-5 text-foreground">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-heading text-xl font-bold">Sửa: {article.title}</h1>
        <AuditButton targetType="academy" targetId={article.id} />
      </div>
      <AcademyEditor article={article} categories={categories} />
    </div>
  );
}
