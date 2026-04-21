import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CalendarDays, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { getEventById } from "@/lib/data/content-service";
import { StatusBadge } from "@/components/common/status-badge";
import { siteConfig } from "@/lib/constants/site";
import { cn } from "@/lib/utils";

type EventDetailPageProps = { params: { id: string } };

export async function generateMetadata({ params }: EventDetailPageProps): Promise<Metadata> {
  const event = await getEventById(params.id);
  if (!event) return { title: "Không tìm thấy sự kiện" };
  return {
    title: event.title,
    description: event.description || `Sự kiện ${event.title} – theo dõi tại Arex.`,
    openGraph: {
      title: event.title,
      description: event.description || `Sự kiện ${event.title}`,
      url: `${siteConfig.url}/events/${event.id}`,
      images: event.image_url ? [{ url: event.image_url }] : [],
    },
  };
}

export const revalidate = 60;

function formatEventDate(dateStr: string) {
  return format(new Date(dateStr), "dd/MM/yyyy HH:mm", { locale: vi });
}

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const event = await getEventById(params.id);
  if (!event) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6 pt-6 md:pt-8">
      <Link
        href="/events"
        className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Tất cả sự kiện
      </Link>

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <StatusBadge status={event.status} />
        </div>
        <h1 className="font-heading text-2xl font-bold uppercase tracking-[0.04em] text-[#0052ff] dark:text-amber-400 md:text-3xl">
          {event.title}
        </h1>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <CalendarDays className="size-4 shrink-0" />
          <span className="font-semibold">
            {formatEventDate(event.start_date)}
            {event.end_date && event.end_date !== event.start_date && (
              <> → {formatEventDate(event.end_date)}</>
            )}
          </span>
        </div>
      </div>

      {event.image_url && (
        <div className="relative w-full overflow-hidden rounded-2xl border border-border" style={{ aspectRatio: "16/9" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={event.image_url}
            alt={event.title}
            className="absolute inset-0 h-full w-full object-cover"
          />
        </div>
      )}

      {event.description && (
        <div className="glass-card rounded-2xl p-6">
          <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
            {event.description}
          </p>
        </div>
      )}

      {event.link && (
        <div className="pt-2">
          <a
            href={event.link}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "inline-flex w-full items-center justify-center gap-2 rounded-xl border px-5 py-3 text-sm font-bold uppercase tracking-[0.1em] transition-all",
              event.status === "active"
                ? "border-[#ff9800]/40 bg-[#ff9800]/10 text-[#ff9800] hover:bg-[#ff9800]/20"
                : event.status === "upcoming"
                  ? "border-[#4CAF50]/40 bg-[#4CAF50]/10 text-[#4CAF50] hover:bg-[#4CAF50]/20"
                  : "border-border bg-muted/50 text-muted-foreground hover:bg-muted",
            )}
          >
            <ExternalLink className="size-4 shrink-0" />
            Tham gia sự kiện
          </a>
        </div>
      )}
    </div>
  );
}
