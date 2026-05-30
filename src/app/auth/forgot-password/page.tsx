"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Mail, CheckCircle2, Inbox, AlertCircle } from "lucide-react";

export default function ForgotPasswordPage() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (searchParams.get("error") === "expired") {
      toast.error("LINK ĐÃ HẾT HẠN. VUI LÒNG YÊU CẦU LẠI.");
    }
  }, [searchParams]);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim()) {
      toast.error("VUI LÒNG NHẬP EMAIL.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      if (res.status === 429) {
        toast.error("GỬI QUÁ NHIỀU LẦN. VUI LÒNG ĐỢI VÀI PHÚT RỒI THỬ LẠI.");
        return;
      }

      // Always show success — don't reveal if email exists
      setSent(true);
      toast.success("EMAIL ĐẶT LẠI MẬT KHẨU ĐÃ ĐƯỢC GỬI.");
    } catch {
      toast.error("KHÔNG THỂ GỬI EMAIL. VUI LÒNG THỬ LẠI SAU.");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-10">
        <section className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-[0_20px_60px_rgba(2,6,23,0.15)] text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-green-500/10">
            <CheckCircle2 className="size-7 text-green-500" />
          </div>
          <h1 className="font-heading text-xl font-bold uppercase tracking-[0.08em] text-foreground">
            KIỂM TRA EMAIL CỦA BẠN
          </h1>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            Chúng tôi đã gửi link đặt lại mật khẩu đến{" "}
            <span className="font-semibold text-foreground">{email}</span>.
            Nhấp vào link trong email để tạo mật khẩu mới.
          </p>

          <div className="mt-5 flex items-start gap-3 rounded-xl border border-border/60 bg-muted/30 px-4 py-3 text-left">
            <Inbox className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <p className="text-[12px] text-muted-foreground leading-relaxed">
              Không thấy email? Kiểm tra thư mục <strong>Spam / Junk</strong>.
              Link có hiệu lực trong <strong>60 phút</strong>.
            </p>
          </div>

          <button
            type="button"
            onClick={() => { setSent(false); setEmail(""); }}
            className="mt-5 text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground hover:text-foreground transition-colors"
          >
            Gửi lại với email khác
          </button>

          <div className="mt-3">
            <Link
              href="/auth/login"
              className="text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground hover:text-foreground transition-colors"
            >
              Quay lại đăng nhập
            </Link>
          </div>
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
              NHẬP EMAIL ĐỂ NHẬN LINK ĐẶT LẠI MẬT KHẨU
            </p>
          </div>
        </div>

        {searchParams.get("error") === "expired" && (
          <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/8 px-4 py-3">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
            <p className="text-sm text-destructive">Link đặt lại mật khẩu đã hết hạn. Vui lòng yêu cầu gửi lại.</p>
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <Input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            required
            placeholder="ĐỊA CHỈ EMAIL"
            autoComplete="email"
            className="h-11 rounded-xl uppercase tracking-[0.02em] font-medium placeholder:uppercase"
          />
          <Button
            type="submit"
            disabled={loading}
            className="h-11 w-full rounded-xl uppercase tracking-[0.08em] font-bold"
          >
            {loading ? "ĐANG GỬI..." : "GỬI LINK ĐẶT LẠI"}
          </Button>
        </form>

        <div className="mt-5 text-center">
          <Link
            href="/login"
            className="text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground hover:text-foreground transition-colors"
          >
            Chưa có tài khoản? Đăng ký miễn phí
          </Link>
        </div>
      </section>
    </main>
  );
}
