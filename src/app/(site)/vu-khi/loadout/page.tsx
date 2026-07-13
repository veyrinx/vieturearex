import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Layers } from "lucide-react";
import { siteConfig } from "@/lib/constants/site";
import { SectionHeading } from "@/components/common/section-heading";
import { getAllLoadouts } from "@/lib/data/ff-data";
import { LoadoutBrowser } from "@/components/ff-items/loadout-browser";

export const metadata: Metadata = {
  title: "Combo vũ khí Free Fire — Loadout theo lối chơi | Arex",
  description:
    "Các bộ combo vũ khí Free Fire (súng chính + phụ) gợi ý theo lối chơi rush, bắn tỉa, hỗ trợ — kèm chỉ dẫn cách dùng.",
  alternates: { canonical: `${siteConfig.url}/vu-khi/loadout` },
};

export default async function LoadoutPage() {
  const loadouts = await getAllLoadouts();

  return (
    <main className="container-main my-8 space-y-8">
      <Link
        href="/vu-khi"
        className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> Danh sách vũ khí
      </Link>

      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Layers className="size-5" />
        </div>
        <SectionHeading title="Combo vũ khí" eyebrow="Loadout theo lối chơi" align="left" />
      </div>

      {loadouts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
          <p className="text-sm text-muted-foreground">Chưa có combo nào được cập nhật.</p>
        </div>
      ) : (
        <LoadoutBrowser loadouts={loadouts} />
      )}
    </main>
  );
}
