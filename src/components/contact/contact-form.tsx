"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { contactSchema, type ContactInput } from "@/lib/validators/contact";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function ContactForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: "",
      email: "",
      message: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    const response = await fetch("/api/contact", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(values),
    });

    if (!response.ok) {
      toast.error("Gửi liên hệ thất bại. Vui lòng thử lại.");
      return;
    }

    toast.success("Đã gửi liên hệ thành công.");
    reset();
  });

  return (
    <form onSubmit={onSubmit} className="glass-card space-y-4 rounded-2xl p-5">
      <div className="space-y-2">
        <label htmlFor="name" className="text-sm text-muted-foreground">
          Họ tên
        </label>
        <Input
          id="name"
          {...register("name")}
          className="border-border bg-background/80 text-foreground placeholder:text-muted-foreground"
          placeholder="Tên của bạn"
        />
        {errors.name ? <p className="text-xs text-rose-300">{errors.name.message}</p> : null}
      </div>

      <div className="space-y-2">
        <label htmlFor="email" className="text-sm text-muted-foreground">
          Email
        </label>
        <Input
          id="email"
          type="email"
          {...register("email")}
          className="border-border bg-background/80 text-foreground placeholder:text-muted-foreground"
          placeholder="you@email.com"
        />
        {errors.email ? <p className="text-xs text-rose-300">{errors.email.message}</p> : null}
      </div>

      <div className="space-y-2">
        <label htmlFor="message" className="text-sm text-muted-foreground">
          Tin nhắn
        </label>
        <Textarea
          id="message"
          {...register("message")}
          className="min-h-36 border-border bg-background/80 text-foreground placeholder:text-muted-foreground"
          placeholder="Nhập nội dung bạn cần hỗ trợ..."
        />
        {errors.message ? (
          <p className="text-xs text-rose-300">{errors.message.message}</p>
        ) : null}
      </div>

      <Button
        disabled={isSubmitting}
        type="submit"
        className="w-full rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
      >
        {isSubmitting ? "Đang gửi..." : "Gửi liên hệ"}
      </Button>
    </form>
  );
}

