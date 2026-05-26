"use client";

import { useState } from "react";
import { ImageIcon, Pencil, X, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAdminRole } from "@/hooks/use-admin-role";
import type { EventItem } from "@/lib/types/content";

type Props = {
  event: EventItem;
  onUpdate?: (newImageUrl: string) => void;
};

export function EventImageEditor({ event, onUpdate }: Props) {
  const { canEdit } = useAdminRole();
  const [editing, setEditing] = useState(false);
  const [url, setUrl] = useState(event.image_url || "");
  const [saving, setSaving] = useState(false);

  if (!canEdit) return null;

  const handleSave = async () => {
    const trimmed = url.trim();
    if (!trimmed) { toast.error("URL không được để trống."); return; }
    try { new URL(trimmed); } catch { toast.error("URL không hợp lệ."); return; }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/events", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: event.id,
          title: event.title,
          description: event.description || "",
          start_date: event.start_date,
          end_date: event.end_date,
          image_url: trimmed,
          thumbnail_url: event.thumbnail_url || trimmed,
          link: event.link || "",
          server_region: event.server_region || "",
          status: event.status,
        }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || "Lỗi khi lưu.");
      }
      toast.success("Đã cập nhật ảnh!");
      setEditing(false);
      onUpdate?.(trimmed);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Không thể lưu.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-2 flex items-center gap-2">
      {editing ? (
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-primary/40 bg-background/80 px-3 py-2">
          <input
            autoFocus
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleSave();
              if (e.key === "Escape") { setEditing(false); setUrl(event.image_url || ""); }
            }}
          />
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="flex size-7 items-center justify-center rounded-lg bg-primary text-white transition hover:opacity-90 disabled:opacity-50"
            aria-label="Lưu"
          >
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
          </button>
          <button
            type="button"
            onClick={() => { setEditing(false); setUrl(event.image_url || ""); }}
            className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground transition"
            aria-label="Hủy"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-muted-foreground/40 px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-primary/50 hover:text-primary"
        >
          {event.image_url ? (
            <><Pencil className="size-3" /> Đổi ảnh sự kiện</>
          ) : (
            <><ImageIcon className="size-3" /> Thêm ảnh sự kiện</>
          )}
        </button>
      )}
    </div>
  );
}
