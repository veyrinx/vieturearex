import type { Metadata } from "next";
import { AcademyEditor } from "@/components/craftland/admin-panels";
import { requireAdminCapability } from "@/lib/server/admin-access";
import { getAcademyCategories } from "@/lib/server/craftland-academy";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Bài Academy mới" };

export default async function NewAcademyArticlePage() {
  await requireAdminCapability("craftland.content");
  const categories = await getAcademyCategories();
  return (
    <div className="space-y-5 text-foreground">
      <h1 className="font-heading text-xl font-bold">Bài Academy mới</h1>
      <AcademyEditor article={null} categories={categories} />
    </div>
  );
}
