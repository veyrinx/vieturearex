"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Lock, UserCircle, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { contactSchema, type ContactInput } from "@/lib/validators/contact";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export function ContactForm() {
  const [prefilled, setPrefilled] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
  } = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: "", email: "", message: "" },
  });

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user?.email) return;
      const { data: profile } = await supabase
        .from("users")
        .select("display_name")
        .eq("id", data.user.id)
        .maybeSingle() as { data: { display_name: string | null } | null };
      const name = profile?.display_name ?? data.user.email.split("@")[0];
      setValue("name", name, { shouldValidate: false });
      setValue("email", data.user.email, { shouldValidate: false });
      setPrefilled(true);
    });
  }, [setValue]);

  const onSubmit = handleSubmit(async (values) => {
    const response = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!response.ok) {
      toast.error("Gửi liên hệ thất bại. Vui lòng thử lại.");
      return;
    }
    toast.success("Đã gửi liên hệ thành công. Chúng tôi sẽ phản hồi sớm nhất có thể.");
    reset({ message: "" });
  });

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-border bg-card space-y-4 p-5">
      {prefilled && (
        <div className="flex items-center gap-2 rounded-xl border border-primary/25 bg-primary/6 px-3 py-2.5 dark:border-amber-400/25 dark:bg-amber-400/6">
          <UserCircle className="size-4 shrink-0 text-primary dark:text-amber-400" />
          <p className="text-xs font-medium text-primary dark:text-amber-400">
            Thông tin được lấy tự động từ tài khoản của bạn
          </p>
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="name" className="flex items-center gap-1.5 text-sm text-muted-foreground">
          Họ tên
          {prefilled && <Lock className="size-3 text-muted-foreground/50" />}
        </label>
        <Input
          id="name"
          {...register("name")}
          readOnly={prefilled}
          className={cn(
            "border-border bg-background/80 text-foreground placeholder:text-muted-foreground",
            prefilled && "cursor-default opacity-70 focus-visible:ring-0",
          )}
          placeholder="Tên của bạn"
        />
        {errors.name && <p className="text-xs text-rose-300">{errors.name.message}</p>}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="email" className="flex items-center gap-1.5 text-sm text-muted-foreground">
          Email
          {prefilled && <Lock className="size-3 text-muted-foreground/50" />}
        </label>
        <Input
          id="email"
          type="email"
          {...register("email")}
          readOnly={prefilled}
          className={cn(
            "border-border bg-background/80 text-foreground placeholder:text-muted-foreground",
            prefilled && "cursor-default opacity-70 focus-visible:ring-0",
          )}
          placeholder="you@email.com"
        />
        {errors.email && <p className="text-xs text-rose-300">{errors.email.message}</p>}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="message" className="text-sm text-muted-foreground">
          Tin nhắn
        </label>
        <Textarea
          id="message"
          {...register("message")}
          className="min-h-36 border-border bg-background/80 text-foreground placeholder:text-muted-foreground"
          placeholder="Nhập nội dung bạn cần hỗ trợ..."
        />
        {errors.message && <p className="text-xs text-rose-300">{errors.message.message}</p>}
      </div>

      <Button
        disabled={isSubmitting}
        type="submit"
        className="w-full gap-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
      >
        <Send className="size-4" />
        {isSubmitting ? "Đang gửi..." : "Gửi liên hệ"}
      </Button>
    </form>
  );
}
