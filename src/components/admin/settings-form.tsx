"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { SiteSetting } from "@/lib/types/content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import {
  defaultSiteSettingValues,
  getSettingsFormInitialState,
  settingsFormFieldOrder,
} from "@/lib/utils/site-settings";

type SettingsFormProps = {
  settings: SiteSetting[];
  onSaved: () => Promise<void>;
};

const settingsMeta: Record<string, { label: string; description: string }> = {
  "branding.site_name": {
    label: "TÊN WEBSITE",
    description: "TÊN THƯƠNG HIỆU HIỂN THỊ TRÊN TOÀN BỘ WEBSITE VÀ TIÊU ĐỀ TRÌNH DUYỆT.",
  },
  "branding.logo_light_url": {
    label: "LOGO CHẾ ĐỘ SÁNG (URL)",
    description: "URL ẢNH LOGO DÙNG CHO CHẾ ĐỘ SÁNG (LIGHT MODE). KHUYẾN NGHỊ: PNG NỀN TRONG.",
  },
  "branding.logo_dark_url": {
    label: "LOGO CHẾ ĐỘ TỐI (URL)",
    description: "URL ẢNH LOGO DÙNG CHO CHẾ ĐỘ TỐI (DARK MODE). KHUYẾN NGHỊ: PNG NỀN TRONG, MÀU SÁNG.",
  },
  "seo.default_title": {
    label: "TIÊU ĐỀ SEO MẶC ĐỊNH",
    description: "TIÊU ĐỀ HIỂN THỊ TRÊN GOOGLE VÀ CÁC CÔNG CỤ TÌM KIẾM. NÊN DƯỚI 60 KÝ TỰ.",
  },
  "seo.default_description": {
    label: "MÔ TẢ SEO MẶC ĐỊNH",
    description: "MÔ TẢ NGẮN HIỂN THỊ TRÊN KẾT QUẢ TÌM KIẾM GOOGLE. NÊN DƯỚI 160 KÝ TỰ.",
  },
  "home.hero.title": {
    label: "TIÊU ĐỀ TRANG CHỦ",
    description: "TIÊU ĐỀ CHÍNH HIỂN THỊ Ở KHU VỰC HERO CỦA TRANG CHỦ.",
  },
  "home.background.desktop_urls": {
    label: "DANH SÁCH ẢNH DESKTOP",
    description: "NHẬP RIÊNG TỪNG URL ẢNH DESKTOP CHO 3 KHUNG SLIDER TRANG CHỦ.",
  },
  "home.background.mobile_urls": {
    label: "DANH SÁCH ẢNH MOBILE",
    description: "NHẬP RIÊNG TỪNG URL ẢNH MOBILE CHO 3 KHUNG SLIDER TRANG CHỦ.",
  },
  "home.background.transition_effect": {
    label: "HIỆU ỨNG CHUYỂN CẢNH",
    description: "CHỌN HIỆU ỨNG CHUYỂN ẢNH CHO SLIDER TRANG CHỦ.",
  },
  "home.background.interval_seconds": {
    label: "THỜI GIAN CHỜ CHUYỂN ẢNH",
    description: "NHẬP SỐ GIÂY GIỮA MỖI LẦN CHUYỂN ẢNH. MẶC ĐỊNH 5 GIÂY.",
  },
  "home.background.transition_seconds": {
    label: "THỜI GIAN CHUYỂN CẢNH",
    description: "NHẬP SỐ GIÂY DÀNH CHO HIỆU ỨNG CHUYỂN ẢNH. MẶC ĐỊNH 1 GIÂY.",
  },
  "social.facebook_url": {
    label: "LINK FACEBOOK",
    description: "LIÊN KẾT FACEBOOK SẼ ĐỒNG BỘ Ở FOOTER, LIÊN HỆ VÀ SEO.",
  },
  "social.tiktok_url": {
    label: "LINK TIKTOK",
    description: "LIÊN KẾT TIKTOK SẼ ĐỒNG BỘ Ở FOOTER, LIÊN HỆ VÀ SEO.",
  },
  "social.youtube_url": {
    label: "LINK YOUTUBE",
    description: "LIÊN KẾT YOUTUBE SẼ ĐỒNG BỘ Ở FOOTER, LIÊN HỆ VÀ SEO.",
  },
  "social.email": {
    label: "EMAIL LIÊN HỆ",
    description: "EMAIL HỖ TRỢ SẼ ĐỒNG BỘ Ở FOOTER VÀ TRANG LIÊN HỆ.",
  },
  "zalo.webhook_url": {
    label: "ZALO WEBHOOK URL",
    description: "URL WEBHOOK ĐỂ GỬI THÔNG BÁO QUA ZALO OA KHI CÓ BÀI VIẾT MỚI.",
  },
  "zalo.group_id": {
    label: "ZALO GROUP ID",
    description: "ID NHÓM ZALO ĐỂ GỬI TIN NHẮN THÔNG BÁO TỰ ĐỘNG.",
  },
  "ads.google_adsense_id": {
    label: "GOOGLE ADSENSE ID",
    description: "ID ADSENSE (VD: ca-pub-XXXXXXXXXX) ĐỂ HIỂN THỊ QUẢNG CÁO GOOGLE TRÊN WEBSITE.",
  },
};

const sliderEffectOptions = [
  { value: "fade", label: "FADE" },
  { value: "zoom", label: "ZOOM CINEMATIC" },
  { value: "slide", label: "SLIDE SMOOTH" },
  { value: "drift", label: "DRIFT PARALLAX" },
  { value: "cinematic", label: "CINEMATIC BLUR" },
] as const;

function getImageSlots(value: string) {
  const slots = value.split(/\r?\n/);
  return Array.from({ length: 3 }, (_, index) => slots[index] ?? "");
}

export function SettingsForm({ settings, onSaved }: SettingsFormProps) {
  const [state, setState] = useState<Record<string, string>>(() => getSettingsFormInitialState(settings));
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setState(getSettingsFormInitialState(settings));
  }, [settings]);

  const updateImageSlot = (key: string, slotIndex: number, nextValue: string) => {
    setState((prev) => {
      const nextSlots = getImageSlots(prev[key] ?? "");
      nextSlots[slotIndex] = nextValue;
      return {
        ...prev,
        [key]: nextSlots.join("\n"),
      };
    });
  };

  const entries = settingsFormFieldOrder.map((key) => [key, state[key] ?? defaultSiteSettingValues[key] ?? ""] as const);

  const saveSetting = async (key: string, value: string) => {
    const response = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ key, value }),
    });

    if (!response.ok) {
      toast.error("LƯU CÀI ĐẶT THẤT BẠI.");
      return false;
    }

    return true;
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);

    const results = await Promise.all(
      entries.map(([key, value]) => saveSetting(key, value))
    );

    setIsSaving(false);

    if (results.some((ok) => !ok)) {
      return;
    }

    toast.success("ĐÃ CẬP NHẬT CÀI ĐẶT.");
    await onSaved();
  };

  return (
    <form onSubmit={onSubmit} className="glass-card space-y-4 rounded-2xl p-4 md:p-5">
      {entries.map(([key, value]) => {
        const meta = settingsMeta[key] ?? {
          label: key.toUpperCase(),
          description: "KHÓA CẤU HÌNH BỔ SUNG ĐƯỢC ĐỒNG BỘ TRỰC TIẾP TỪ HỆ THỐNG.",
        };

        return (
          <div key={key} className="space-y-2">
            <div className="space-y-1">
              <label className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {meta.label}
              </label>
              <p className="text-xs uppercase tracking-[0.08em] text-primary">{key}</p>
              <p className="text-sm uppercase tracking-[0.05em] text-muted-foreground">{meta.description}</p>
            </div>
            {key === "home.background.desktop_urls" || key === "home.background.mobile_urls" ? (
              <div className="grid gap-3">
                {getImageSlots(value).map((slotValue, slotIndex) => (
                  <div key={`${key}-${slotIndex}`} className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-primary">
                      ẢNH {slotIndex + 1}
                    </p>
                    <Input
                      value={slotValue}
                      onChange={(event) => updateImageSlot(key, slotIndex, event.target.value)}
                      placeholder={`URL ẢNH ${slotIndex + 1}`}
                      className="border-border bg-background text-foreground"
                    />
                  </div>
                ))}
              </div>
            ) : key === "home.background.transition_effect" ? (
              <Select
                value={value}
                onValueChange={(nextValue) =>
                  setState((prev) => ({
                    ...prev,
                    [key]: nextValue ?? "",
                  }))
                }
              >
                <SelectTrigger className="border-border bg-background text-foreground">
                  {key === "home.background.transition_effect"
                    ? sliderEffectOptions.find((item) => item.value === value)?.label ?? "FADE"
                    : value === "true"
                      ? "BẬT"
                      : "TẮT"}
                </SelectTrigger>
                <SelectContent className="border-border bg-card text-foreground">
                  {key === "home.background.transition_effect"
                    ? sliderEffectOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))
                    : ["true", "false"].map((option) => (
                      <SelectItem key={option} value={option}>
                        {option === "true" ? "BẬT" : "TẮT"}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                type={
                  key === "home.background.interval_seconds" || key === "home.background.transition_seconds"
                    ? "number"
                    : "text"
                }
                step={
                  key === "home.background.interval_seconds" || key === "home.background.transition_seconds"
                    ? "0.5"
                    : undefined
                }
                min={
                  key === "home.background.interval_seconds"
                    ? "2"
                    : key === "home.background.transition_seconds"
                      ? "0.4"
                      : undefined
                }
                value={value}
                onChange={(event) =>
                  setState((prev) => ({
                    ...prev,
                    [key]: event.target.value,
                  }))
                }
                className="border-border bg-background text-foreground"
              />
            )}
          </div>
        );
      })}

      <Button type="submit" disabled={isSaving} className="rounded-xl">
        {isSaving ? "ĐANG LƯU..." : "LƯU CÀI ĐẶT"}
      </Button>
    </form>
  );
}
