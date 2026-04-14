"use client";

import { useEffect, useState } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "arex_bookmarked_events";

function getBookmarks(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function setBookmarks(ids: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

export function EventBookmarkButton({ eventId, title, className }: { eventId: string; title: string; className?: string }) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(getBookmarks().includes(eventId));
  }, [eventId]);

  const toggle = () => {
    const current = getBookmarks();
    if (current.includes(eventId)) {
      setBookmarks(current.filter((id) => id !== eventId));
      setSaved(false);
      toast.success("ĐÃ BỎ LƯU SỰ KIỆN");
    } else {
      setBookmarks([...current, eventId]);
      setSaved(true);
      toast.success(`ĐÃ LƯU: ${title}`);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      title={saved ? "Bỏ lưu" : "Lưu sự kiện"}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all",
        saved
          ? "bg-primary/10 text-primary border border-primary/20 dark:bg-amber-400/10 dark:text-amber-400 dark:border-amber-400/20"
          : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary dark:hover:bg-amber-400/10 dark:hover:text-amber-400",
        className,
      )}
    >
      {saved ? <BookmarkCheck className="size-3.5" /> : <Bookmark className="size-3.5" />}
      {saved ? "ĐÃ LƯU" : "LƯU"}
    </button>
  );
}

export function useBookmarkedEventIds() {
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => { setIds(getBookmarks()); }, []);
  return ids;
}
