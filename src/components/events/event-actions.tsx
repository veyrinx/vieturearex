"use client";

import { useEffect, useState } from "react";
import { Heart, Bell, BellOff } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const FAV_KEY = "arex_favorite_events";
const FOLLOW_KEY = "arex_followed_events";

function readList(key: string): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(raw) ? raw.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function writeList(key: string, ids: string[]) {
  localStorage.setItem(key, JSON.stringify(Array.from(new Set(ids))));
}

export function FavoriteButton({
  eventId, title, className,
}: {
  eventId: string; title: string; className?: string;
}) {
  const [on, setOn] = useState(false);

  useEffect(() => { setOn(readList(FAV_KEY).includes(eventId)); }, [eventId]);

  const toggle = () => {
    const list = readList(FAV_KEY);
    if (list.includes(eventId)) {
      writeList(FAV_KEY, list.filter((id) => id !== eventId));
      setOn(false);
      toast.success("Đã bỏ yêu thích");
    } else {
      writeList(FAV_KEY, [...list, eventId]);
      setOn(true);
      toast.success(`Đã thêm vào yêu thích: ${title}`);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      title={on ? "Bỏ yêu thích" : "Yêu thích"}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-all",
        on
          ? "border-rose-500/30 bg-rose-500/10 text-rose-500"
          : "border-border bg-muted text-muted-foreground hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-500",
        className,
      )}
    >
      <Heart className={cn("size-3.5", on && "fill-current")} />
      {on ? "Đã thích" : "Yêu thích"}
    </button>
  );
}

export function FollowButton({
  eventId, title, className,
}: {
  eventId: string; title: string; className?: string;
}) {
  const [on, setOn] = useState(false);

  useEffect(() => { setOn(readList(FOLLOW_KEY).includes(eventId)); }, [eventId]);

  const toggle = () => {
    const list = readList(FOLLOW_KEY);
    if (list.includes(eventId)) {
      writeList(FOLLOW_KEY, list.filter((id) => id !== eventId));
      setOn(false);
      toast.success("Đã tắt theo dõi sự kiện này");
    } else {
      writeList(FOLLOW_KEY, [...list, eventId]);
      setOn(true);
      toast.success(`Đang theo dõi: ${title}`);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      title={on ? "Bỏ theo dõi" : "Theo dõi"}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-all",
        on
          ? "border-primary/30 bg-primary/10 text-primary dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-400"
          : "border-border bg-muted text-muted-foreground hover:border-primary/30 hover:bg-primary/10 hover:text-primary dark:hover:border-amber-400/30 dark:hover:bg-amber-400/10 dark:hover:text-amber-400",
        className,
      )}
    >
      {on ? <Bell className="size-3.5" /> : <BellOff className="size-3.5" />}
      {on ? "Đang theo dõi" : "Theo dõi"}
    </button>
  );
}

export function useFavoriteEventIds() {
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => { setIds(readList(FAV_KEY)); }, []);
  return ids;
}

export function useFollowedEventIds() {
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => { setIds(readList(FOLLOW_KEY)); }, []);
  return ids;
}
