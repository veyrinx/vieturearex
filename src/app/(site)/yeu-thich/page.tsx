import type { Metadata } from "next";
import { getEvents } from "@/lib/data/content-service";
import { FavoritesClient } from "@/components/events/favorites-client";

export const metadata: Metadata = { title: "Sự kiện đã lưu" };
export const revalidate = 60;

export default async function FavoritesPage() {
  const events = await getEvents();
  return (
    <div className="space-y-6 pt-4">
      <div className="space-y-1">
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-primary dark:text-amber-400">Sự kiện</p>
        <h1 className="font-heading text-3xl font-black uppercase tracking-[0.04em] text-foreground">
          Sự kiện của tôi
        </h1>
        <p className="text-sm text-muted-foreground">
          Tổng hợp các sự kiện bạn đã yêu thích và đang theo dõi.
        </p>
      </div>
      <FavoritesClient initialEvents={events} />
    </div>
  );
}
