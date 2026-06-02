import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CalendarDays, ExternalLink, Eye, UserCircle2, Clock } from "lucide-react";
import { getEventById } from "@/lib/data/content-service";
import { formatVietnamDateTime } from "@/lib/utils/vietnam-time";
import { StatusBadge } from "@/components/common/status-badge";
import { EventViewTracker } from "@/components/events/event-view-tracker";
import { EventComments } from "@/components/events/event-comments";
import { EventImageEditor } from "@/components/events/event-image-editor";
import { EventImageDisplay } from "@/components/events/event-image-display";
import { PollWidget } from "@/components/common/poll-widget";
import { siteConfig } from "@/lib/constants/site";
import { cn } from "@/lib/utils";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

async function getEventPoll(eventId: string) {
  try {
    const sb = createAdminSupabaseClient() ?? createServerSupabaseClient();
    if (!sb) return null;
    const { data } = await (sb.from("polls") as ReturnType<typeof sb.from>)
      .select("id, question, status, ends_at, poll_options(id, label, display_order)")
      .eq("entity_type", "event")
      .eq("entity_id", eventId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle() as { data: { id: string; question: string; status: string; ends_at: string | null; poll_options: { id: string; label: string; display_order: number }[] } | null };
    return data ?? null;
  } catch {
    return null;
  }
}

type EventDetailPageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: EventDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const event = await getEventById(id);
  if (!event) return { title: "Không tìm thấy sự kiện" };
  const url = `${siteConfig.url}/events/${event.id}`;
  const desc = event.description || `Sự kiện ${event.title} – theo dõi tại Arex.`;
  // Always use the generated OG image (same domain → Zalo/Telegram can fetch it reliably)
  const ogImageUrl = `${siteConfig.url}/events/${event.id}/opengraph-image`;
  return {
    title: event.title,
    description: desc,
    alternates: { canonical: url },
    openGraph: {
      title: event.title,
      description: desc,
      url,
      type: "article",
      siteName: siteConfig.name,
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: event.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: event.title,
      description: desc,
      images: [ogImageUrl],
    },
    robots: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  };
}

export const revalidate = 60;

function formatEventDate(dateStr: string) {
  return formatVietnamDateTime(dateStr);
}

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const { id } = await params;
  const [event, poll] = await Promise.all([
    getEventById(id),
    getEventPoll(id),
  ]);
  if (!event) notFound();

  const authorName = event.updated_by_name || event.created_by_name;

  return (
    <div className="mx-auto max-w-3xl space-y-6 pt-6 md:pt-8">
      <EventViewTracker eventId={event.id} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Event",
            name: event.title,
            description: event.description || event.title,
            startDate: event.start_date,
            endDate: event.end_date || event.start_date,
            eventStatus:
              event.status === "active"
                ? "https://schema.org/EventScheduled"
                : event.status === "upcoming"
                  ? "https://schema.org/EventScheduled"
                  : "https://schema.org/EventCancelled",
            eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
            location: {
              "@type": "VirtualLocation",
              url: event.link || `${siteConfig.url}/events/${event.id}`,
            },
            image: event.image_url ? [event.image_url] : undefined,
            url: `${siteConfig.url}/events/${event.id}`,
            organizer: { "@type": "Organization", name: siteConfig.name, url: siteConfig.url },
            inLanguage: "vi-VN",
          }),
        }}
      />

      {/* Back */}
      <Link
        href="/events"
        className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-3.5" />
        Tất cả sự kiện
      </Link>

      {/* Hero card */}
      <div className="overflow-hidden rounded-3xl border border-border bg-card">
        {/* Image with overlay */}
        {event.image_url ? (
          <div className="relative h-56 overflow-hidden md:h-80">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={event.image_url} alt={event.title} className="absolute inset-0 size-full object-cover" loading="lazy" />
            <div className={cn(
              "absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent",
            )} />
            {/* Status badge on image */}
            <div className="absolute left-4 top-4">
              <StatusBadge status={event.status} />
            </div>
            {/* Title overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-5 md:p-7">
              <h1 className="font-heading text-2xl font-black uppercase tracking-[0.04em] text-white drop-shadow-md md:text-3xl">
                {event.title}
              </h1>
            </div>
          </div>
        ) : (
          <div className="p-6 pb-0">
            <StatusBadge status={event.status} />
            <h1 className="mt-3 font-heading text-2xl font-black uppercase tracking-[0.04em] text-foreground md:text-3xl">
              {event.title}
            </h1>
          </div>
        )}

        {/* Meta bar */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border bg-muted/30 px-5 py-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5 font-semibold">
            <CalendarDays className="size-3.5 shrink-0 text-primary dark:text-amber-400" />
            {formatEventDate(event.start_date)}
            {event.end_date && event.end_date !== event.start_date && (
              <><span className="opacity-50">→</span>{formatEventDate(event.end_date)}</>
            )}
          </span>
          {event.view_count > 0 && (
            <span className="flex items-center gap-1.5">
              <Eye className="size-3.5 shrink-0" />
              {event.view_count.toLocaleString("vi-VN")} lượt xem
            </span>
          )}
          {authorName && (
            <span className="flex items-center gap-1.5">
              <UserCircle2 className="size-3.5 shrink-0" />
              <span className="font-semibold text-foreground">{authorName}</span>
            </span>
          )}
          {event.server_region && (
            <span className="flex items-center gap-1.5 ml-auto font-bold uppercase tracking-wider text-[10px]">
              <Clock className="size-3.5" /> {event.server_region.toUpperCase()}
            </span>
          )}
        </div>

        {/* Description */}
        {event.description && (
          <div className="p-5 md:p-7">
            <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">
              {event.description}
            </p>
          </div>
        )}

        {/* Join button */}
        {event.link && (
          <div className="border-t border-border p-4 md:px-7">
            <a
              href={event.link}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "inline-flex w-full items-center justify-center gap-2 rounded-xl border px-5 py-3 text-sm font-bold uppercase tracking-[0.1em] transition-all hover:shadow-lg",
                event.status === "active"
                  ? "border-[#ff9800]/40 bg-[#ff9800]/10 text-[#ff9800] hover:bg-[#ff9800]/20 hover:shadow-[0_4px_20px_rgba(255,152,0,0.2)]"
                  : event.status === "upcoming"
                    ? "border-[#4CAF50]/40 bg-[#4CAF50]/10 text-[#4CAF50] hover:bg-[#4CAF50]/20 hover:shadow-[0_4px_20px_rgba(76,175,80,0.2)]"
                    : "border-border bg-muted/50 text-muted-foreground hover:bg-muted",
              )}
            >
              <ExternalLink className="size-4 shrink-0" />
              Tham gia sự kiện
            </a>
          </div>
        )}
      </div>

      <EventImageEditor event={event} />

      {poll && (
        <PollWidget
          pollId={poll.id}
          question={poll.question}
          options={poll.poll_options.sort((a, b) => a.display_order - b.display_order)}
          endsAt={poll.ends_at}
        />
      )}

      <EventComments eventId={event.id} />
    </div>
  );
}
