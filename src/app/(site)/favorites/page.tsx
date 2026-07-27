import type { Metadata } from "next";
import { Heart } from "lucide-react";
import { getEvents } from "@/lib/data/content-service";
import { FavoritesClient } from "@/components/events/favorites-client";

export const metadata: Metadata = {
  title: "Sự Kiện Đã Lưu",
  description: "Tổng hợp các sự kiện bạn đã yêu thích và đang theo dõi.",
};
export const revalidate = 60;

export default async function FavoritesPage() {
  const events = await getEvents();
  return (
    <div className="space-y-6 pt-4 md:pt-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 md:p-8">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-rose-500/8 via-transparent to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-rose-500/50 to-transparent" />
        <div className="relative flex items-center gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-rose-500/15">
            <Heart className="size-6 fill-current text-rose-500" />
          </span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-rose-500">Arex</p>
            <h1 className="font-heading text-2xl font-black uppercase tracking-tight text-foreground md:text-3xl">
              Sự Kiện Của Tôi
            </h1>
            <p className="text-sm text-muted-foreground">
              Tổng hợp các sự kiện bạn đã yêu thích và đang theo dõi
            </p>
          </div>
        </div>
      </div>

      <FavoritesClient initialEvents={events} />
    </div>
  );
}
