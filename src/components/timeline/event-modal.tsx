"use client";

import { ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MediaFrame } from "@/components/common/media-frame";
import type { EventItem } from "@/lib/types/content";
import { formatVietnamDate } from "@/lib/utils/vietnam-time";

type EventModalProps = {
  event: EventItem | null;
  open: boolean;
  onOpenChange: (value: boolean) => void;
};

export function EventModal({ event, open, onOpenChange }: EventModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-hidden border border-border bg-card p-0 text-foreground sm:max-w-2xl">
        {event ? (
          <div className="max-h-[92vh] overflow-y-auto">

            {/* Tiêu đề — Lớp 1 */}
            <div className="px-5 pb-3 pt-4">
              <DialogHeader>
                <DialogTitle className="text-center font-heading text-lg font-bold uppercase leading-snug tracking-[0.04em] text-foreground">
                  {event.title}
                </DialogTitle>
              </DialogHeader>
            </div>

            {/* Khung ảnh — Lớp 2 */}
            <div className="px-5">
              <div className="overflow-hidden rounded-[10px]">
                <MediaFrame
                  src={event.image_url}
                  alt={event.title}
                  sizes="100vw"
                  aspectClassName="aspect-[16/9]"
                  imageClassName="object-cover bg-black/5 dark:bg-black/15"
                />
              </div>
            </div>

            {/* Ngày + Button — Lớp 1 */}
            <div className="flex flex-col items-center gap-1.5 px-6 pb-4 pt-3 text-center">
              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
                <p className="text-sm font-semibold uppercase tracking-[0.08em] text-foreground">
                  BẮT ĐẦU:{" "}
                  <span className="font-bold text-emerald-500">
                    {formatVietnamDate(event.start_date)}
                  </span>
                </p>
                <span className="text-muted-foreground/40">→</span>
                <p className="text-sm font-semibold uppercase tracking-[0.08em] text-foreground">
                  KẾT THÚC:{" "}
                  <span className="font-bold text-rose-500">
                    {formatVietnamDate(event.end_date)}
                  </span>
                </p>
              </div>

              {event.link?.trim() ? (
                <Button asChild className="mt-2 h-9 w-full rounded-[10px]">
                  <a href={event.link} target="_blank" rel="noreferrer">
                    TRUY CẬP LIÊN KẾT
                    <ExternalLink className="ml-2 size-4" />
                  </a>
                </Button>
              ) : null}
            </div>

          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
