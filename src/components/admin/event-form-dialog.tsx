"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DatePickerInput } from "@/components/common/date-picker-input";
import { ImageUploadButton } from "@/components/common/image-upload-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { EventItem } from "@/lib/types/content";
import { useEventServers } from "@/hooks/use-event-servers";
import { guessServerFromImageUrl } from "@/lib/constants/event-servers";
import { createClient } from "@/lib/supabase/client";
import {
  formatVietnamDateInput,
  formatVietnamTimeInput,
  toVietnamIsoFromDateTimeInput,
} from "@/lib/utils/vietnam-time";

type EventFormDialogProps = {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  initialData?: EventItem | null;
  triggerLabel: string;
  showTrigger?: boolean;
  onSaved: () => Promise<void>;
  /** "duplicate" prefills from initialData but creates a brand new event. */
  mode?: "edit" | "duplicate";
};

const eventFormSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(4, "Tiêu đề cần ít nhất 4 ký tự.").max(120),
  description: z.string().trim().max(3000, "Mô tả tối đa 3000 ký tự.").optional().default(""),
  start_date: z.string().trim().min(1, "Vui lòng chọn ngày bắt đầu."),
  start_time: z.string().trim().optional(),
  end_date: z.string().trim().min(1, "Vui lòng chọn ngày kết thúc."),
  end_time: z.string().trim().optional(),
  image_url: z.string().trim().min(1, "Vui lòng nhập URL ảnh.").url("Ảnh sự kiện phải là URL hợp lệ."),
  thumbnail_url: z.string().trim().optional().catch("").default(""),
  link: z.string().trim().optional().default("").refine(
    (v) => !v || z.string().url().safeParse(v).success,
    { message: "Liên kết phải là URL hợp lệ (vd: https://example.com)." }
  ),
  server_region: z.string().trim().optional().default(""),
});

type EventFormValues = z.input<typeof eventFormSchema>;

export function EventFormDialog({
  open,
  onOpenChange,
  initialData,
  triggerLabel,
  showTrigger = true,
  onSaved,
  mode = "edit",
}: EventFormDialogProps) {
  const isDuplicate = mode === "duplicate";
  const isEditing = Boolean(initialData) && !isDuplicate;
  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: "",
      description: "",
      start_date: formatVietnamDateInput(new Date()),
      start_time: "00:00",
      end_date: formatVietnamDateInput(new Date()),
      end_time: "23:59",
      image_url: "",
      thumbnail_url: "",
      link: "",
      server_region: "vn",
    },
  });

  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  // Admin đã tự chọn server thì thôi đoán — ý người bao giờ cũng thắng máy.
  const [serverTouched, setServerTouched] = useState(false);
  const eventServers = useEventServers();
  const imageUrl = (watch("image_url") ?? "").trim();
  const serverValue = (watch("server_region") ?? "").trim().toLowerCase();

  // Server đang gán mà không còn trong danh sách (admin ẩn preset, hoặc custom
  // server tải về chậm hơn lần render đầu) vẫn phải có option riêng: <select>
  // không có option khớp sẽ tự nhả value, lưu lại là sự kiện âm thầm đổi server.
  const serverOptions = useMemo(() => {
    if (!serverValue || eventServers.some((s) => s.key === serverValue)) {
      return eventServers;
    }
    return [
      ...eventServers,
      { key: serverValue, label: `${serverValue.toUpperCase()} (không còn trong danh sách)`, short: serverValue.toUpperCase(), flag: "🏳️", color: "" },
    ];
  }, [eventServers, serverValue]);

  // Dán link ảnh Free Fire là biết luôn server: ảnh Garena mang sẵn mã vùng
  // trong đường dẫn ("/Local/VN/", "OB47VN"). Chỉ điền hộ khi tạo mới hoặc nhân
  // bản — sự kiện đã lưu thì giá trị trong CSDL là quyết định của admin.
  useEffect(() => {
    if (serverTouched || (isEditing && !isDuplicate)) return;
    const guess = guessServerFromImageUrl(imageUrl);
    if (guess && guess !== serverValue) {
      setValue("server_region", guess, { shouldDirty: true });
    }
  }, [imageUrl, serverTouched, serverValue, isEditing, isDuplicate, setValue]);

  useEffect(() => {
    const supabase = createClient();
    if (supabase) {
      supabase.auth.getUser().then(({ data }) => {
        setAdminEmail(data.user?.email ?? null);
      });
    }
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    setServerTouched(false);

    if (initialData) {
      reset({
        id: isDuplicate ? undefined : initialData.id,
        title: isDuplicate ? `${initialData.title} (bản sao)`.slice(0, 120) : initialData.title,
        description: initialData.description ?? "",
        start_date: formatVietnamDateInput(initialData.start_date),
        start_time: formatVietnamTimeInput(initialData.start_date),
        end_date: formatVietnamDateInput(initialData.end_date),
        end_time: formatVietnamTimeInput(initialData.end_date),
        image_url: initialData.image_url,
        thumbnail_url: initialData.thumbnail_url ?? initialData.image_url,
        link: initialData.link ?? "",
        server_region: initialData.server_region ?? "vn",
      });
      return;
    }

    reset({
      title: "",
      description: "",
      start_date: formatVietnamDateInput(new Date()),
      start_time: "00:00",
      end_date: formatVietnamDateInput(new Date()),
      end_time: "23:59",
      image_url: "",
      thumbnail_url: "",
      link: "",
      server_region: "vn",
    });
  }, [initialData, isDuplicate, open, reset]);

  const onSubmit = handleSubmit(async (values) => {
    const cleanedStartDate = (values.start_date || "").trim();
    const cleanedEndDate = (values.end_date || "").trim();
    const cleanedImageUrl = (values.image_url || "").trim();

    if (!values.title?.trim() || !cleanedStartDate || !cleanedEndDate || !cleanedImageUrl) {
      toast.error("Vui lòng điền đầy đủ tiêu đề, ngày bắt đầu, ngày kết thúc và ảnh sự kiện.");
      return;
    }

    const startIso = toVietnamIsoFromDateTimeInput(cleanedStartDate, values.start_time || "00:00");
    const endIso = toVietnamIsoFromDateTimeInput(cleanedEndDate, values.end_time || "23:59");
    if (new Date(endIso).getTime() <= new Date(startIso).getTime()) {
      toast.error("Thời gian kết thúc phải sau thời gian bắt đầu.");
      return;
    }

    const method = isEditing ? "PATCH" : "POST";
    const response = await fetch("/api/admin/events", {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...values,
        id: isEditing ? values.id : undefined,
        description: values.description?.trim() ?? "",
        start_date: startIso,
        end_date: endIso,
        thumbnail_url: values.thumbnail_url || values.image_url,
        link: values.link || "",
        server_region: (values.server_region || "").trim() || "vn",
      }),
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => null)) as { error?: string } | null;
      toast.error(errorData?.error ?? "Không thể lưu sự kiện.");
      return;
    }

    toast.success(isEditing ? "Đã cập nhật sự kiện." : "Đã tạo sự kiện mới.");
    onOpenChange(false);
    await onSaved();
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {showTrigger ? (
        <DialogTrigger className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-medium uppercase tracking-[0.08em] text-primary-foreground transition hover:brightness-110">
          {triggerLabel}
        </DialogTrigger>
      ) : null}

      <DialogContent className="max-h-[92vh] overflow-hidden border-border bg-card p-0 text-foreground sm:max-w-3xl">
        <div className="max-h-[92vh] overflow-y-auto px-6 py-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="font-heading text-xl uppercase text-foreground pr-8">
              {isEditing ? "Chỉnh sửa sự kiện" : isDuplicate ? "Nhân bản sự kiện" : "Tạo sự kiện mới"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm">
              Trạng thái sẽ tự động cập nhật theo múi giờ Việt Nam.
            </DialogDescription>
            {adminEmail && (
              <div className="inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/8 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-primary">
                <UserCog className="size-3 shrink-0" />
                {isEditing ? "Cập nhật bởi:" : "Tạo bởi:"} {adminEmail}
              </div>
            )}
          </DialogHeader>

          <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Tiêu đề
              </label>
              <Input {...register("title")} className="border-border bg-background text-foreground" />
              {errors.title ? <p className="text-xs text-rose-500">{errors.title.message}</p> : null}
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Mô tả sự kiện (không bắt buộc)
              </label>
              <Textarea
                {...register("description")}
                rows={3}
                placeholder="Nhập mô tả ngắn về sự kiện..."
                className="resize-none border-border bg-background text-foreground"
              />
              {errors.description ? <p className="text-xs text-rose-500">{errors.description.message}</p> : null}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Ngày bắt đầu
              </label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Controller
                    control={control}
                    name="start_date"
                    render={({ field }) => (
                      <DatePickerInput value={field.value} onChange={field.onChange} />
                    )}
                  />
                </div>
                <Input
                  {...register("start_time")}
                  type="time"
                  className="w-[110px] border-border bg-background text-foreground"
                />
              </div>
              {errors.start_date ? <p className="text-xs text-rose-500">{errors.start_date.message}</p> : null}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Ngày kết thúc
              </label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Controller
                    control={control}
                    name="end_date"
                    render={({ field }) => (
                      <DatePickerInput value={field.value} onChange={field.onChange} />
                    )}
                  />
                </div>
                <Input
                  {...register("end_time")}
                  type="time"
                  className="w-[110px] border-border bg-background text-foreground"
                />
              </div>
              {errors.end_date ? <p className="text-xs text-rose-500">{errors.end_date.message}</p> : null}
            </div>

            <div className="space-y-2 md:col-span-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Ảnh sự kiện
                </label>
                <ImageUploadButton
                  bucket="events"
                  label="Tải ảnh lên"
                  onUploaded={(url) => {
                    setValue("image_url", url, { shouldValidate: true });
                    toast.success("Đã tải ảnh lên.");
                  }}
                />
              </div>
              <Input
                {...register("image_url")}
                placeholder="https://..."
                className="border-border bg-background text-foreground"
              />
              {errors.image_url ? <p className="text-xs text-rose-500">{errors.image_url.message}</p> : null}
              {imageUrl && !errors.image_url ? (
                <Image
                  src={imageUrl}
                  alt="Xem trước ảnh sự kiện"
                  width={640}
                  height={240}
                  unoptimized
                  className="h-36 w-full rounded-xl border border-border object-cover"
                />
              ) : null}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Server / Khu vực
              </label>
              <select
                {...register("server_region", { onChange: () => setServerTouched(true) })}
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {serverOptions.map((s) => (
                  <option key={s.key} value={s.key}>{s.flag} {s.label}</option>
                ))}
              </select>
              <p className="text-[11px] text-muted-foreground">Sự kiện thuộc server nào (Việt Nam, Global, SEA…)</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Liên kết ngoài (không bắt buộc)
              </label>
              <Input {...register("link")} className="border-border bg-background text-foreground" />
              {errors.link ? <p className="text-xs text-rose-500">{errors.link.message}</p> : null}
            </div>

            <div className="md:col-span-2">
              <Button type="submit" disabled={isSubmitting} className="w-full rounded-xl">
                {isSubmitting ? "ĐANG LƯU..." : "LƯU SỰ KIỆN"}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
