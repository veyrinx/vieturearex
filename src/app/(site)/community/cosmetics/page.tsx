"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CheckCircle2, Loader2, Palette, Shield, Star, Lock } from "lucide-react";

type FrameRow = {
  id: string;
  name: string;
  css_ring: string;
  description: string | null;
  rarity: string;
};

type TitleRow = {
  id: string;
  name: string;
  color: string;
  description: string | null;
  rarity: string;
  requirement: string | null;
};

type CosmeticsData = {
  myFrame: string | null;
  myTitle: string | null;
  myColor: string;
  frames: FrameRow[];
  titles: TitleRow[];
};

const PROFILE_COLORS = [
  "#6366f1", "#3b82f6", "#10b981", "#f59e0b",
  "#ef4444", "#ec4899", "#8b5cf6", "#06b6d4",
  "#f97316", "#64748b",
];

const RARITY_STYLES: Record<string, string> = {
  common:    "bg-muted text-muted-foreground",
  rare:      "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  epic:      "bg-purple-500/15 text-purple-600 dark:text-purple-400",
  legendary: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
};

const RARITY_LABELS: Record<string, string> = {
  common:    "Phổ thông",
  rare:      "Hiếm",
  epic:      "Sử thi",
  legendary: "Huyền thoại",
};

function RarityBadge({ rarity }: { rarity: string }) {
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", RARITY_STYLES[rarity] ?? RARITY_STYLES.common)}>
      {RARITY_LABELS[rarity] ?? rarity}
    </span>
  );
}

export default function CosmeticsPage() {
  const [data,    setData]    = useState<CosmeticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [unauth,  setUnauth]  = useState(false);
  const [saving,  setSaving]  = useState<string | null>(null);

  const [selectedFrame, setSelectedFrame] = useState<string | null>(null);
  const [selectedTitle, setSelectedTitle] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string>("#6366f1");

  useEffect(() => {
    fetch("/api/users/cosmetics")
      .then(async (res) => {
        if (res.status === 401) { setUnauth(true); return; }
        if (!res.ok) return;
        const json: CosmeticsData = await res.json();
        setData(json);
        setSelectedFrame(json.myFrame);
        setSelectedTitle(json.myTitle);
        setSelectedColor(json.myColor ?? "#6366f1");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const save = useCallback(async (payload: Record<string, unknown>, section: string) => {
    setSaving(section);
    try {
      const res = await fetch("/api/users/cosmetics", {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Không thể lưu thay đổi.");
        return false;
      }
      toast.success("Đã lưu thay đổi!");
      return true;
    } catch {
      toast.error("Lỗi kết nối. Vui lòng thử lại.");
      return false;
    } finally {
      setSaving(null);
    }
  }, []);

  async function handleFrameSelect(frameId: string | null) {
    setSelectedFrame(frameId);
    await save({ frame_id: frameId }, "frame");
  }

  async function handleTitleSelect(title: string | null) {
    setSelectedTitle(title);
    await save({ title }, "title");
  }

  async function handleColorSelect(color: string) {
    setSelectedColor(color);
    await save({ color }, "color");
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl py-20 text-center">
        <Loader2 className="mx-auto size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (unauth) {
    return (
      <div className="mx-auto max-w-4xl py-20 text-center space-y-4">
        <Lock className="mx-auto size-10 text-muted-foreground/40" />
        <p className="text-base font-semibold text-muted-foreground">Vui lòng đăng nhập để xem trang này</p>
        <Link
          href="/auth/login"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-primary/90 transition-colors"
        >
          Đăng nhập
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl py-8 md:py-12 space-y-10">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-7">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-500/8 via-transparent to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />
        <div className="relative flex items-center gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-violet-500/15">
            <Palette className="size-6 text-violet-600 dark:text-violet-400" />
          </span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-violet-600 dark:text-violet-400">Hồ Sơ</p>
            <h1 className="font-heading text-2xl font-black uppercase tracking-tight text-foreground">Trang Cá Nhân</h1>
            <p className="text-sm text-muted-foreground">Tuỳ chỉnh khung avatar, danh hiệu và màu hồ sơ</p>
          </div>
        </div>
      </div>

      {/* Section 1: Avatar Frames */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="size-4 text-primary dark:text-amber-400" />
          <h2 className="font-heading text-lg font-black uppercase tracking-tight text-foreground">Khung Avatar</h2>
          {saving === "frame" && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {(data?.frames ?? []).map((frame) => {
            const isSelected = selectedFrame === frame.id;
            return (
              <button
                key={frame.id}
                onClick={() => handleFrameSelect(isSelected ? null : frame.id)}
                className={cn(
                  "group flex flex-col items-center gap-3 rounded-2xl border p-4 text-center transition-all",
                  isSelected
                    ? "border-primary/50 bg-primary/8 dark:border-amber-400/40 dark:bg-amber-400/8"
                    : "border-border bg-card hover:border-primary/30 hover:bg-muted/50",
                )}
              >
                {/* Frame preview */}
                <div className={cn("relative size-14 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 dark:from-amber-400/20 dark:to-amber-400/5", frame.css_ring)}>
                  {isSelected && (
                    <CheckCircle2 className="absolute -right-1 -top-1 size-5 rounded-full bg-card text-primary dark:text-amber-400" />
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold">{frame.name}</p>
                  <RarityBadge rarity={frame.rarity} />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Section 2: Titles */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Star className="size-4 text-primary dark:text-amber-400" />
          <h2 className="font-heading text-lg font-black uppercase tracking-tight text-foreground">Danh Hiệu</h2>
          {saving === "title" && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
        </div>
        <div className="space-y-2">
          {(data?.titles ?? []).map((t) => {
            const isSelected = selectedTitle === t.name;
            return (
              <button
                key={t.id}
                onClick={() => handleTitleSelect(isSelected ? null : t.name)}
                className={cn(
                  "group flex w-full items-center gap-4 rounded-xl border p-3.5 text-left transition-all",
                  isSelected
                    ? "border-primary/40 bg-primary/8 dark:border-amber-400/30 dark:bg-amber-400/8"
                    : "border-border bg-card hover:border-primary/20 hover:bg-muted/40",
                )}
              >
                <span
                  className="shrink-0 text-sm font-black"
                  style={{ color: t.color }}
                >
                  {t.name}
                </span>
                <div className="min-w-0 flex-1">
                  {t.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1">{t.description}</p>
                  )}
                  {t.requirement && (
                    <p className="text-[10px] text-muted-foreground/70 mt-0.5">Yêu cầu: {t.requirement}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <RarityBadge rarity={t.rarity} />
                  {isSelected && <CheckCircle2 className="size-4 text-primary dark:text-amber-400" />}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Section 3: Profile Color */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Palette className="size-4 text-primary dark:text-amber-400" />
          <h2 className="font-heading text-lg font-black uppercase tracking-tight text-foreground">Màu Hồ Sơ</h2>
          {saving === "color" && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
        </div>
        <div className="flex flex-wrap gap-3">
          {PROFILE_COLORS.map((color) => {
            const isSelected = selectedColor === color;
            return (
              <button
                key={color}
                onClick={() => handleColorSelect(color)}
                className={cn(
                  "relative size-10 rounded-full transition-all hover:scale-110",
                  isSelected && "ring-4 ring-offset-2 ring-offset-background",
                )}
                style={{ backgroundColor: color, outline: isSelected ? `3px solid ${color}` : undefined, outlineOffset: isSelected ? "3px" : undefined }}
                title={color}
              >
                {isSelected && (
                  <CheckCircle2 className="absolute inset-0 m-auto size-5 text-white drop-shadow" />
                )}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          Màu được chọn: <span className="font-mono font-bold" style={{ color: selectedColor }}>{selectedColor}</span>
        </p>
      </section>
    </div>
  );
}
