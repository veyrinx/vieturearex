"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Mail, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    const supabase = createClient();
    if (!supabase) {
      setLoading(false);
      toast.error("KHÔNG THỂ KẾT NỐI MÁY CHỦ.");
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email);
    setLoading(false);

    if (error) {
      const msg = error.message?.toLowerCase() ?? "";
      if (msg.includes("rate limit") || msg.includes("too many")) {
        toast.error("GỬI QUÁ NHIỀU LẦN. VUI LÒNG ĐỢI VÀI PHÚT RỒI THỬ LẠI.");
      } else if (msg.includes("user not found") || msg.includes("invalid email")) {
        toast.error("KHÔNG TÌM THẤY TÀI KHOẢN VỚI EMAIL NÀY.");
      } else {
        toast.error("KHÔNG THỂ GỬI EMAIL. VUI LÒNG KIỂM TRA LẠI EMAIL HOẶC THỬ SAU.");
      }
      return;
    }

    setSent(true);
    toast.success("MÃ XÁC NHẬN ĐÃ ĐƯỢC GỬI ĐẾN EMAIL CỦA BẠN.");
    // Chuyển sang trang nhập OTP sau 1.5 giây để user thấy toast
    window.setTimeout(() => {
      router.push(`/auth/verify-otp?email=${encodeURIComponent(email)}`);
    }, 1500);
  };

  // Màn hình xác nhận đã gửi
  if (sent) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-10">
        <section className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-[0_20px_60px_rgba(2,6,23,0.15)] text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-green-500/10">
            <CheckCircle2 className="size-7 text-green-500" />
          </div>
          <h1 className="font-heading text-xl font-bold uppercase tracking-[0.08em] text-foreground">
            ĐÃ GỬI MÃ XÁC NHẬN
          </h1>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            KIỂM TRA HỘP THƯ{" "}
            <span className="font-semibold text-foreground">{email.toUpperCase()}</span>{" "}
            VÀ NHẬP MÃ 6 SỐ ĐỂ ĐẶT LẠI MẬT KHẨU.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            ĐANG CHUYỂN ĐẾN TRANG NHẬP MÃ...
          </p>
          <Link
            href="/auth/login"
            className="mt-6 block text-xs uppercase tracking-[0.06em] font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            QUAY LẠI ĐĂNG NHẬP
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-[0_20px_60px_rgba(2,6,23,0.15)] relative">
        <Link
          href="/auth/login"
          className="absolute top-6 left-6 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Quay lại"
        >
          <ArrowLeft className="size-5" />
        </Link>

        <div className="mb-8 text-center mt-2">
          <div className="flex flex-col items-center">
            <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-primary/10">
              <Mail className="size-6 text-primary" />
            </div>
            <h1 className="font-heading text-2xl font-bold uppercase tracking-[0.08em] text-foreground">
              QUÊN MẬT KHẨU
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              NHẬP EMAIL ĐỂ NHẬN MÃ XÁC NHẬN 6 SỐ
            </p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <Input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            required
            placeholder="ĐỊA CHỈ EMAIL"
            className="h-11 rounded-xl uppercase tracking-[0.02em] font-medium placeholder:uppercase"
          />
          <Button
            type="submit"
            disabled={loading}
            className="h-11 w-full rounded-xl uppercase tracking-[0.08em] font-bold"
          >
            {loading ? "ĐANG GỬI MÃ..." : "GỬI MÃ XÁC NHẬN"}
          </Button>
        </form>
      </section>
    </main>
  );
}
