import type { Metadata } from "next";
import { getEvents } from "@/lib/data/content-service";
import { FavoritesClient } from "@/components/events/favorites-client";

export const metadata: Metadata = { title: "Sự kiện đã lưu" };
export const revalidate = 60;

export default async function FavoritesPage() {
  const events = await getEvents();
  return (
    <div className="space-y-6 pt-4">
      <header>
        <h1 className="font-heading text-3xl font-black uppercase tracking-[0.06em] text-foreground">
          Sự kiện của tôi
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tổng hợp các sự kiện bạn đã yêu thích và đang theo dõi.
        </p>
      </header>
      <FavoritesClient initialEvents={events} />
    </div>
  );
}
