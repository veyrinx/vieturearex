import { MapForm } from "@/components/craftland/studio-forms";
import { getCategories, requireStudioUser } from "@/lib/server/craftland";

export const dynamic = "force-dynamic";

export default async function NewMapPage() {
  const { creator } = await requireStudioUser({ needProfile: true });
  const categories = await getCategories();
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-2xl font-bold">Bản đồ mới</h1>
        <p className="text-sm text-muted-foreground">Lưu bản nháp bất cứ lúc nào. Bản đồ chỉ hiển thị công khai sau khi được kiểm duyệt.</p>
      </div>
      <div className="rounded-2xl border border-border bg-card p-5 md:p-6">
        <MapForm map={null} categories={categories} canPublish={!!creator?.can_publish && creator.status === "active"} />
      </div>
    </div>
  );
}
