"use client";

import { useEffect, useRef } from "react";

export function EventViewTracker({ eventId }: { eventId: string }) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    fetch(`/api/events/${eventId}/view`, { method: "POST" }).catch(() => null);
  }, [eventId]);

  return null;
}
