import Link from "next/link";
import { ProfileForm } from "@/components/craftland/studio-forms";
import { requireStudioUser, tbl } from "@/lib/server/craftland";
import { craftlandCreatorHref } from "@/lib/constants/craftland";

export const dynamic = "force-dynamic";

export default async function StudioProfilePage() {
  const { userId, creator } = await requireStudioUser();
  const { data: user } = (await tbl("users").select("display_name").eq("id", userId).maybeSingle()) as unknown as { data: { display_name: string | null } | null };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold">{creator ? "Hồ sơ creator" : "Tạo hồ sơ creator"}</h1>
          <p className="text-sm text-muted-foreground">Thông tin này hiển thị công khai trên trang creator của bạn.</p>
        </div>
        {creator && <Link href={craftlandCreatorHref(creator.username)} className="text-sm font-medium text-primary hover:underline">Xem trang công khai</Link>}
      </div>
      <div className="rounded-2xl border border-border bg-card p-5 md:p-6">
        <ProfileForm creator={creator} defaultName={user?.display_name ?? ""} />
      </div>
    </div>
  );
}
