import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Swords, Target } from "lucide-react";
import { siteConfig } from "@/lib/constants/site";
import { SectionHeading } from "@/components/common/section-heading";
import { getAllWeapons } from "@/lib/data/ff-data";

export const metadata: Metadata = {
  title: "Vũ khí Free Fire — Chỉ số & Thông tin chi tiết | Arex",
  description:
    "Danh sách vũ khí Free Fire kèm chỉ số sát thương, tầm bắn, tốc độ bắn và vị trí trong meta cộng đồng.",
  alternates: { canonical: `${siteConfig.url}/vu-khi` },
};

export default async function WeaponsPage() {
  const weapons = await getAllWeapons();

  return (
    <main className="container-main my-8 space-y-8">
      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Swords className="size-5" />
        </div>
        <SectionHeading title="Vũ khí Free Fire" eyebrow="Thư viện" align="left" />
      </div>

      {weapons.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
          <p className="text-sm text-muted-foreground">Chưa có vũ khí nào được cập nhật.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {weapons.map((w) => (
            <Link
              key={w.id}
              href={`/vu-khi/${w.slug}`}
              className="group flex flex-col rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/50"
            >
              <div className="mx-auto flex size-24 items-center justify-center rounded-2xl bg-muted/40">
                <Image
                  src={w.image_url}
                  alt={w.name}
                  width={96}
                  height={96}
                  className="size-full object-contain p-2 transition-transform group-hover:scale-105"
                />
              </div>
              <p className="mt-3 truncate text-center font-heading text-sm font-bold uppercase tracking-wide text-foreground">
                {w.name}
              </p>
              <p className="mt-1 flex items-center justify-center gap-1 text-xs text-muted-foreground">
                <Target className="size-3" /> Sát thương {w.damage ?? "—"}
              </p>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
