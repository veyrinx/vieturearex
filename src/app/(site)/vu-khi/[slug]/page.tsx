import { notFound } from "next/navigation";
import { Metadata } from "next";
import Image from "next/image";
import { SectionHeading } from "@/components/common/section-heading";
import { getWeaponBySlug, getTierColor } from "@/lib/data/ff-data";
import { cn } from "@/lib/utils";
import { ItemInteractions } from "@/components/ff-items/item-interactions";
import { Target, Gauge, Zap, ChevronsRight, Box, Calendar } from "lucide-react";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const weapon = await getWeaponBySlug(slug);
  if (!weapon) return { title: "Không tìm thấy" };

  const title = `Vũ khí ${weapon.name} - Chỉ số & Thông tin chi tiết`;
  const description = `Thông tin chi tiết về chỉ số (sát thương, tầm bắn, tốc độ bắn...) và vị trí trong meta của vũ khí ${weapon.name} trong Free Fire.`;

  return {
    title,
    description,
    openGraph: { title, description, images: [weapon.image_url] },
  };
}

export default async function WeaponDetailPage({ params }: Props) {
  const { slug } = await params;
  const weapon = await getWeaponBySlug(slug);
  if (!weapon) notFound();

  const stats = [
    { label: "Sát thương", value: weapon.damage, icon: Target },
    { label: "Tầm bắn", value: weapon.range, icon: ChevronsRight },
    { label: "Tốc độ bắn", value: weapon.rate_of_fire, icon: Zap },
    { label: "Tốc độ thay đạn", value: weapon.reload, icon: Gauge },
    { label: "Băng đạn", value: weapon.magazine, icon: Box },
    { label: "Ngày ra mắt", value: weapon.released_at ? new Date(weapon.released_at).toLocaleDateString("vi-VN") : "N/A", icon: Calendar },
  ];

  return (
    <main className="container-main my-8 space-y-12">
      {/* Header */}
      <div className="flex flex-col items-center gap-6 text-center md:flex-row md:text-left">
        <Image
          src={weapon.image_url}
          alt={weapon.name}
          width={128}
          height={128}
          className="size-32 rounded-3xl border border-border bg-muted/40 object-contain p-2"
          priority
        />
        <div className="space-y-2">
          <h1 className="font-heading text-3xl font-black uppercase tracking-wide text-foreground md:text-4xl">
            {weapon.name}
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">{weapon.description || "Chưa có mô tả."}</p>
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px] lg:gap-10">
        {/* Left: Stats */}
        <div className="space-y-8">
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="mb-4 font-heading text-lg font-bold uppercase tracking-wider">Chỉ số cơ bản</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {stats.map(({ label, value, icon: Icon }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-muted/50 text-muted-foreground">
                    <Icon className="size-4" />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
                    <p className="text-sm font-bold text-foreground">{value ?? "N/A"}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Tier Lists */}
        <div className="space-y-4">
          <SectionHeading title="Meta" eyebrow="Vị trí trong" align="left" />
          {weapon.tier_lists.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
              <p className="text-sm text-muted-foreground">Chưa xuất hiện trong tier list nào.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {weapon.tier_lists.map((tl) => (
                <div key={tl.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                  <div className={cn(
                    "flex size-9 items-center justify-center rounded-lg text-base font-black text-background",
                    getTierColor(tl.tier).color,
                    getTierColor(tl.tier).shadow,
                  )}>
                    {tl.tier}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {tl.kind === "character" ? "Nhân Vật" : "Vũ Khí"} OB{tl.patch}
                    </p>
                    <p className="text-xs text-muted-foreground">Cập nhật {new Date(tl.updated_at).toLocaleDateString("vi-VN")}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Interactions: Ratings & Comments */}
      <ItemInteractions
        itemId={weapon.id}
        initialRatings={weapon.ratings}
        initialComments={weapon.comments}
      />
    </main>
  );
}
