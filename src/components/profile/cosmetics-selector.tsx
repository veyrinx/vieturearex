"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Palette, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/common/user-avatar";
import { UserNameWithTitle } from "@/components/common/user-avatar";

type AvatarFrame = { id: string; name: string; css_ring: string; rarity: string | null };
type UserTitle   = { name: string; color: string; rarity: string | null };

type Props = {
  avatarUrl: string | null;
  displayName: string;
};

const RARITY_BADGE: Record<string, { label: string; cls: string }> = {
  legendary: { label: "Huyền Thoại", cls: "bg-amber-400/20 text-amber-500 border-amber-400/30" },
  epic:      { label: "Sử Thi",      cls: "bg-purple-400/20 text-purple-500 border-purple-400/30" },
  rare:      { label: "Quý",         cls: "bg-blue-400/20 text-blue-500 border-blue-400/30" },
  uncommon:  { label: "Hiếm",        cls: "bg-green-400/20 text-green-500 border-green-400/30" },
  common:    { label: "Thường",      cls: "bg-muted text-muted-foreground border-border" },
};

export function CosmeticsSelector({ avatarUrl, displayName }: Props) {
  const [frames,  setFrames]  = useState<AvatarFrame[]>([]);
  const [titles,  setTitles]  = useState<UserTitle[]>([]);
  const [selectedFrame, setSelectedFrame] = useState<string | null>(null);
  const [selectedTitle, setSelectedTitle] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/user/cosmetics", { credentials: "same-origin" });
    if (!res.ok) return;
    const d = await res.json() as {
      selected_frame_id: string | null;
      selected_title: string | null;
      frames: AvatarFrame[];
      titles: UserTitle[];
    };
    setSelectedFrame(d.selected_frame_id);
    setSelectedTitle(d.selected_title);
    setFrames(d.frames);
    setTitles(d.titles);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const save = async (patch: { selected_frame_id?: string | null; selected_title?: string | null }) => {
    setSaving(true);
    try {
      const res = await fetch("/api/user/cosmetics", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(patch),
      });
      if (res.ok) toast.success("Đã lưu cosmetics!");
      else toast.error("Không thể lưu");
    } catch { toast.error("Lỗi kết nối"); }
    finally { setSaving(false); }
  };

  const equippedFrame = frames.find((f) => f.id === selectedFrame);
  const equippedTitleObj = titles.find((t) => t.name === selectedTitle);

  if (loading) return (
    <div className="flex items-center justify-center py-6">
      <Loader2 className="size-5 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Live preview */}
      <div className="flex items-center gap-4 rounded-2xl border border-border bg-muted/20 p-4">
        <UserAvatar
          name={displayName}
          url={avatarUrl}
          cssRing={equippedFrame?.css_ring ?? null}
          size={14}
        />
        <div>
          <UserNameWithTitle
            name={displayName}
            title={equippedTitleObj?.name ?? null}
            titleColor={equippedTitleObj?.color ?? null}
            className="text-base"
          />
          <p className="text-xs text-muted-foreground mt-0.5">
            {equippedFrame ? equippedFrame.name : "Không có khung"} ·{" "}
            {equippedTitleObj ? equippedTitleObj.name : "Không có danh hiệu"}
          </p>
        </div>
        {saving && <Loader2 className="ml-auto size-4 animate-spin text-muted-foreground" />}
      </div>

      {/* Frames */}
      {frames.length > 0 && (
        <div className="space-y-3">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            <Palette className="size-3.5" /> Khung Avatar ({frames.length})
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {/* No frame option */}
            <button
              onClick={async () => { setSelectedFrame(null); await save({ selected_frame_id: null }); }}
              className={cn(
                "flex items-center gap-3 rounded-xl border p-3 text-left transition",
                !selectedFrame
                  ? "border-primary bg-primary/5 dark:border-amber-400 dark:bg-amber-400/5"
                  : "border-border hover:bg-muted/40",
              )}
            >
              <div className="size-10 rounded-xl bg-muted flex items-center justify-center text-lg">🚫</div>
              <div className="min-w-0">
                <p className="text-xs font-semibold">Không có</p>
                <p className="text-[10px] text-muted-foreground">Bỏ khung</p>
              </div>
              {!selectedFrame && <Check className="ml-auto size-3.5 shrink-0 text-primary dark:text-amber-400" />}
            </button>

            {frames.map((frame) => {
              const isSelected = selectedFrame === frame.id;
              const rMeta = RARITY_BADGE[frame.rarity ?? "common"] ?? RARITY_BADGE.common;
              return (
                <button
                  key={frame.id}
                  onClick={async () => { setSelectedFrame(frame.id); await save({ selected_frame_id: frame.id }); }}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border p-3 text-left transition",
                    isSelected
                      ? "border-primary bg-primary/5 dark:border-amber-400 dark:bg-amber-400/5"
                      : "border-border hover:bg-muted/40",
                  )}
                >
                  <div className="shrink-0">
                    <UserAvatar name={displayName} url={avatarUrl} cssRing={frame.css_ring} size={10} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold">{frame.name}</p>
                    <span className={cn("inline-block rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase", rMeta.cls)}>
                      {rMeta.label}
                    </span>
                  </div>
                  {isSelected && <Check className="ml-auto size-3.5 shrink-0 text-primary dark:text-amber-400" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Titles */}
      {titles.length > 0 && (
        <div className="space-y-3">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            🏷 Danh Hiệu ({titles.length})
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <button
              onClick={async () => { setSelectedTitle(null); await save({ selected_title: null }); }}
              className={cn(
                "rounded-xl border p-3 text-left transition",
                !selectedTitle
                  ? "border-primary bg-primary/5 dark:border-amber-400 dark:bg-amber-400/5"
                  : "border-border hover:bg-muted/40",
              )}
            >
              <p className="text-xs font-semibold">Không có</p>
              <p className="text-[10px] text-muted-foreground">Bỏ danh hiệu</p>
              {!selectedTitle && <Check className="mt-1 size-3.5 text-primary dark:text-amber-400" />}
            </button>

            {titles.map((title) => {
              const isSelected = selectedTitle === title.name;
              const rMeta = RARITY_BADGE[title.rarity ?? "common"] ?? RARITY_BADGE.common;
              return (
                <button
                  key={title.name}
                  onClick={async () => { setSelectedTitle(title.name); await save({ selected_title: title.name }); }}
                  className={cn(
                    "rounded-xl border p-3 text-left transition",
                    isSelected
                      ? "border-primary bg-primary/5 dark:border-amber-400 dark:bg-amber-400/5"
                      : "border-border hover:bg-muted/40",
                  )}
                >
                  <UserNameWithTitle name="" title={title.name} titleColor={title.color} />
                  <span className={cn("mt-1 inline-block rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase", rMeta.cls)}>
                    {rMeta.label}
                  </span>
                  {isSelected && <Check className="mt-1 size-3.5 text-primary dark:text-amber-400" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {frames.length === 0 && titles.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">Chưa có cosmetics nào. Tham gia giải đấu và đóng góp cộng đồng để mở khóa!</p>
        </div>
      )}
    </div>
  );
}
