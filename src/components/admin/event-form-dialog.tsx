"use client";

import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DatePickerInput } from "@/components/common/date-picker-input";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { EventItem } from "@/lib/types/content";
import {
  formatVietnamDateInput,
  toVietnamIsoFromDateInput,
} from "@/lib/utils/vietnam-time";

type EventFormDialogProps = {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  initialData?: EventItem | null;
  triggerLabel: string;
  showTrigger?: boolean;
  onSaved: () => Promise<void>;
};

type EventFormValues = {
  id?: string;
  title: string;
  start_date: string;
  end_date: string;
  image_url: string;
  thumbnail_url?: string;
  link?: string;
};

const eventFormSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(4, "Tiêu đề cần ít nhất 4 ký tự.").max(120),
  start_date: z.string().trim().min(1, "Vui lòng chọn ngày bắt đầu."),
  end_date: z.string().trim().min(1, "Vui lòng chọn ngày kết thúc."),
  image_url: z.string().trim().min(1, "Vui lòng nhập URL ảnh.").url("Ảnh sự kiện phải là URL hợp lệ."),
  thumbnail_url: z.string().trim().optional().catch("").default(""),
  link: z.string().trim().optional().catch("").default(""),
});

export function EventFormDialog({
  open,
  onOpenChange,
  initialData,
  triggerLabel,
  showTrigger = true,
  onSaved,
}: EventFormDialogProps) {
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: "",
      start_date: formatVietnamDateInput(new Date()),
      end_date: formatVietnamDateInput(new Date()),
      image_url: "",
      thumbnail_url: "",
      link: "",
    },
  });

  const initialEventId = initialData?.id;

  useEffect(() => {
    if (!open) {
      return;
    }

    if (initialData) {
      reset({
        id: initialData.id,
        title: initialData.title,
        start_date: formatVietnamDateInput(initialData.start_date),
        end_date: formatVietnamDateInput(initialData.end_date),
        image_url: initialData.image_url,
        thumbnail_url: initialData.thumbnail_url ?? initialData.image_url,
        link: initialData.link ?? "",
      });
      return;
    }

    reset({
      title: "",
      start_date: formatVietnamDateInput(new Date()),
      end_date: formatVietnamDateInput(new Date()),
      image_url: "",
      thumbnail_url: "",
      link: "",
    });
  }, [initialData, open, reset]);

  const onSubmit = handleSubmit(async (values) => {
    const cleanedStartDate = (values.start_date || "").trim();
    const cleanedEndDate = (values.end_date || "").trim();
    const cleanedImageUrl = (values.image_url || "").trim();

    if (!values.title?.trim() || !cleanedStartDate || !cleanedEndDate || !cleanedImageUrl) {
      toast.error("Vui lòng điền đầy đủ tiêu đề, ngày bắt đầu, ngày kết thúc và ảnh sự kiện.");
      return;
    }

    const method = initialData ? "PATCH" : "POST";
    const response = await fetch("/api/admin/events", {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...values,
        description: "",
        start_date: toVietnamIsoFromDateInput(cleanedStartDate),
        end_date: toVietnamIsoFromDateInput(cleanedEndDate),
        thumbnail_url: values.thumbnail_url || values.image_url,
        link: values.link || "",
      }),
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => null)) as { error?: string } | null;
      toast.error(errorData?.error ?? "Không thể lưu sự kiện.");
      return;
    }

    toast.success(initialData ? "Đã cập nhật sự kiện." : "Đã tạo sự kiện mới.");
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
              {initialData ? "Chỉnh sửa sự kiện" : "Tạo sự kiện mới"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Trạng thái sẽ tự động cập nhật theo múi giờ Việt Nam. Bạn chỉ cần nhập tiêu đề, ngày và ảnh sự kiện.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Tiêu đề
              </label>
              <Input {...register("title")} className="border-border bg-background text-foreground" />
              {errors.title ? <p className="text-xs text-rose-500">{errors.title.message}</p> : null}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Ngày bắt đầu
              </label>
              <Controller
                control={control}
                name="start_date"
                render={({ field }) => (
                  <DatePickerInput value={field.value} onChange={field.onChange} />
                )}
              />
              {errors.start_date ? <p className="text-xs text-rose-500">{errors.start_date.message}</p> : null}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Ngày kết thúc
              </label>
              <Controller
                control={control}
                name="end_date"
                render={({ field }) => (
                  <DatePickerInput value={field.value} onChange={field.onChange} />
                )}
              />
              {errors.end_date ? <p className="text-xs text-rose-500">{errors.end_date.message}</p> : null}
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Ảnh sự kiện
              </label>
              <Input {...register("image_url")} className="border-border bg-background text-foreground" />
              {errors.image_url ? <p className="text-xs text-rose-500">{errors.image_url.message}</p> : null}
            </div>

            <div className="space-y-2 md:col-span-2">
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
