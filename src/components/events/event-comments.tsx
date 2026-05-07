"use client";

import { CommentThread } from "@/components/common/comment-thread";

type Props = { eventId: string };

export function EventComments({ eventId }: Props) {
  return (
    <CommentThread
      apiPath={`/api/events/${eventId}/comments`}
      realtimeTable="event_comments"
      realtimeFilter={`event_id=eq.${eventId}`}
      realtimeChannel={`event-comments:${eventId}`}
    />
  );
}
