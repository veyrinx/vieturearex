"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, ShieldCheck, Loader2, MailCheck } from "lucide-react";

export default function VerifyOtpPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const otpLengths = [6];

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email) {
      toast.error("KHÔNG TÌM THẤY EMAIL YÊU CẦU ĐẶT LẠI.");
      return;
    }

    if (!otpLengths.includes(otp.length)) {
      toast.error("VUI LÒNG NHẬP ĐÚNG MÃ XÁC NHẬN 6 SỐ.");
      return;
    }

    setLoading(true);

    const supabase = createClient();
    if (!supabase) {
      setLoading(false);
      toast.error("KHÔNG THỂ KẾT NỐI MÁY CHỦ.");
      return;
    }

    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: "recovery",
    });

    setLoading(false);

    if (error) {
      console.error("verifyOtp error", error);
      toast.error(
        error.message
          ? `LỖI OTP: ${error.message}`
          : "MÃ XÁC NHẬN KHÔNG NHẬN DẠNG HOẶC ĐÃ HẾT HẠN."
      );
      return;
    }

    // Lưu access_token để update-password page dùng lại
    if (data.session) {
      sessionStorage.setItem("recovery_access_token", data.session.access_token);
      sessionStorage.setItem("recovery_refresh_token", data.session.refresh_token);
    }

    toast.success("XÁC NHẬN THÀNH CÔNG. HÃY NHẬP MẬT KHẨU MỚI.");
    router.push("/auth/update-password");
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/4 top-1/4 size-[400px] rounded-full bg-blue-500/8 blur-[120px]" />
        <div className="absolute right-1/4 bottom-1/4 size-[300px] rounded-full bg-primary/5 blur-[100px] dark:bg-amber-400/4" />
      </div>

      <section className="relative w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-xl">
        <Link href="/auth/forgot-password" aria-label="Quay lại"
          className="absolute top-5 left-5 flex size-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors">
          <ArrowLeft className="size-4" />
        </Link>

        <div className="mb-6 text-center mt-4 space-y-3">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-blue-500/10">
            <ShieldCheck className="size-7 text-blue-500" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500">Xác thực</p>
            <h1 className="mt-1 font-heading text-2xl font-bold uppercase tracking-[0.06em] text-foreground">
              Nhập Mã OTP
            </h1>
            {email && (
              <p className="mt-2 flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
                <MailCheck className="size-3.5 shrink-0" />
                Mã đã gửi tới <span className="font-semibold text-foreground">{email}</span>
              </p>
            )}
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Mã 6 chữ số</label>
            <Input
              value={otp}
              onChange={(event) => setOtp(event.target.value.trim().replace(/\D/g, "").slice(0, 6))}
              type="text"
              required
              maxLength={6}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="• • • • • •"
              className="h-16 font-mono text-center text-3xl font-bold tracking-[0.5em] rounded-2xl placeholder:text-3xl placeholder:tracking-[0.5em] placeholder:text-muted-foreground/30"
            />
          </div>
          <Button type="submit" disabled={loading || otp.length !== 6}
            className="h-12 w-full rounded-xl uppercase tracking-[0.08em] font-bold gap-2 shadow-lg shadow-blue-500/20">
            {loading ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
            {loading ? "Đang xác nhận..." : "Xác nhận"}
          </Button>
        </form>

        <p className="mt-5 text-center text-xs text-muted-foreground">
          Không nhận được mã?{" "}
          <Link href="/auth/forgot-password" className="font-semibold text-blue-500 hover:underline">
            Gửi lại
          </Link>
        </p>
      </section>
    </main>
  );
}
