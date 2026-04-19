"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { siteConfig } from "@/lib/constants/site";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Users, Bell, MessageSquare, CalendarDays, MailCheck } from "lucide-react";

export default function UserRegisterPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim() || !email.trim() || !password || !confirm) {
      toast.error("Vui lòng điền đầy đủ thông tin.");
      return;
    }
    if (password !== confirm) {
      toast.error("Mật khẩu xác nhận không khớp.");
      return;
    }
    if (password.length < 6) {
      toast.error("Mật khẩu tối thiểu 6 ký tự.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/user/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password, display_name: displayName.trim() }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Đăng ký thất bại.");
        return;
      }
      toast.success("Tạo tài khoản thành công! Vui lòng kiểm tra email để xác thực.");
      setRegistered(true);
    } catch {
      toast.error("Lỗi mạng, vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  if (registered) {
    return (
      <div className="flex min-h-[85vh] items-center justify-center px-4 py-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md rounded-3xl border border-border/50 bg-card/90 p-10 text-center shadow-xl backdrop-blur-xl"
        >
          <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl bg-green-500/10">
            <MailCheck className="size-8 text-green-500" />
          </div>
          <h2 className="font-heading text-2xl font-bold uppercase tracking-[0.06em] text-foreground">Xác nhận email</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Chúng tôi đã gửi email xác thực đến <strong className="text-foreground">{email}</strong>.
            Vui lòng kiểm tra hộp thư và nhấn vào liên kết xác nhận để kích hoạt tài khoản.
          </p>
          <p className="mt-3 text-xs text-muted-foreground">Không thấy email? Kiểm tra thư mục Spam/Junk.</p>
          <Link href="/login" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline dark:text-amber-400">
            Về trang đăng nhập →
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[85vh] items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-2 lg:gap-12">

        {/* Left — branding */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="hidden flex-col justify-center lg:flex"
        >
          <div className="space-y-6">
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2, duration: 0.5 }}>
              <Image
                src={siteConfig.favicon}
                alt="Arex"
                width={72}
                height={72}
                className="rounded-2xl shadow-[0_16px_40px_rgba(0,82,255,0.15)] dark:shadow-[0_16px_40px_rgba(247,147,26,0.15)]"
              />
            </motion.div>

            <div>
              <h2 className="font-heading text-4xl font-black uppercase text-foreground xl:text-5xl">
                THAM GIA<br />CỘNG ĐỒNG <span className="ff-highlight">AREX</span>
              </h2>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
                Tạo tài khoản miễn phí để trải nghiệm đầy đủ nội dung — theo dõi sự kiện, bình luận bài viết và nhận thông báo realtime.
              </p>
            </div>

            <div className="space-y-3">
              {[
                { icon: CalendarDays, text: "Theo dõi lịch sự kiện realtime" },
                { icon: MessageSquare, text: "Bình luận & tương tác bài viết" },
                { icon: Bell,         text: "Nhận thông báo sự kiện mới" },
                { icon: Users,        text: "Kết nối cộng đồng Free Fire" },
              ].map(({ icon: Icon, text }, i) => (
                <motion.div
                  key={text}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.1, duration: 0.4 }}
                  className="flex items-center gap-3"
                >
                  <div className="flex size-9 items-center justify-center rounded-xl bg-primary/8 dark:bg-amber-400/8">
                    <Icon className="size-4 text-primary dark:text-amber-400" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">{text}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Right — form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative"
        >
          <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/6 blur-[100px] dark:bg-amber-500/6" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-primary/4 blur-[100px] dark:bg-amber-400/4" />

          <section className="relative z-10 rounded-3xl border border-border/50 bg-card/90 p-8 shadow-[0_32px_80px_rgba(2,6,23,0.08)] backdrop-blur-2xl md:p-10">
            <div className="mb-6 text-center space-y-2">
              <div className="lg:hidden mb-4">
                <Image src={siteConfig.favicon} alt="Arex" width={56} height={56} className="mx-auto rounded-2xl" />
              </div>
              <h1 className="font-heading text-2xl font-bold uppercase tracking-[0.06em] text-foreground md:text-3xl">
                TẠO TÀI KHOẢN
              </h1>
            </div>

            <form onSubmit={onSubmit} className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Tên hiển thị</label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Tên của bạn"
                  maxLength={60}
                  className="h-12 rounded-xl border-border/60 bg-background/60 text-foreground placeholder:text-muted-foreground/50"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Email</label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  placeholder="you@gmail.com"
                  className="h-12 rounded-xl border-border/60 bg-background/60 text-foreground placeholder:text-muted-foreground/50"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Mật khẩu</label>
                <div className="relative">
                  <Input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type={showPw ? "text" : "password"}
                    placeholder="Tối thiểu 6 ký tự"
                    className="h-12 rounded-xl border-border/60 bg-background/60 pr-11 text-foreground placeholder:text-muted-foreground/50"
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1">
                    {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Xác nhận mật khẩu</label>
                <Input
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  type="password"
                  placeholder="Nhập lại mật khẩu"
                  className="h-12 rounded-xl border-border/60 bg-background/60 text-foreground placeholder:text-muted-foreground/50"
                />
              </div>

              <p className="text-[11px] text-muted-foreground">
                Bằng cách đăng ký, bạn đồng ý với{" "}
                <Link href="/terms-of-use" className="underline hover:text-primary">Điều khoản sử dụng</Link>
                {" "}và{" "}
                <Link href="/privacy-policy" className="underline hover:text-primary">Chính sách bảo mật</Link>.
              </p>

              <Button type="submit" disabled={loading} className="h-12 w-full rounded-xl text-sm font-bold tracking-wide">
                {loading ? "ĐANG TẠO TÀI KHOẢN..." : "TẠO TÀI KHOẢN"}
              </Button>
            </form>

            <div className="mt-5 text-center text-sm text-muted-foreground">
              Đã có tài khoản?{" "}
              <Link href="/login" className="font-semibold text-primary hover:underline dark:text-amber-400">
                Đăng nhập
              </Link>
            </div>
          </section>
        </motion.div>
      </div>
    </div>
  );
}
