"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft } from "lucide-react";

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
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-[0_20px_60px_rgba(2,6,23,0.15)] relative">
        <Link
          href="/auth/forgot-password"
          className="absolute top-6 left-6 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Quay lại"
        >
          <ArrowLeft className="size-5" />
        </Link>

        <div className="mb-6 text-center mt-2">
          <div className="flex flex-col items-center">
            <h1 className="font-heading text-2xl font-bold uppercase tracking-[0.08em] text-foreground">
              NHẬP MÃ XÁC NHẬN
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              MÃ ĐÃ ĐƯỢC GỬI TỚI {email ? email.toUpperCase() : "EMAIL CỦA BẠN"}
            </p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 mt-8">
          <Input
            value={otp}
            onChange={(event) => setOtp(event.target.value.trim().replace(/\D/g, "").slice(0, 6))}
            type="text"
            required
            maxLength={6}
            placeholder="MÃ SỐ BÍ MẬT GỒM 6 SỐ"
            className="h-14 font-mono text-center text-3xl font-bold tracking-[0.5em] rounded-xl placeholder:text-sm placeholder:tracking-[0.1em] placeholder:font-sans placeholder:font-semibold"
          />
          <Button type="submit" disabled={loading} className="h-11 w-full rounded-xl uppercase tracking-[0.08em] font-bold">
            {loading ? "ĐANG XÁC NHẬN..." : "XÁC NHẬN OTP"}
          </Button>
        </form>
      </section>
    </main>
  );
}
