"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { siteConfig } from "@/lib/constants/site";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, CalendarDays, MessageSquare, Bell, Users } from "lucide-react";

export default function UserLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error("VUI LÒNG NHẬP EMAIL VÀ MẬT KHẨU.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    if (!supabase) {
      setLoading(false);
      toast.error("Hệ thống xác thực chưa sẵn sàng. Vui lòng thử lại sau.");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    setLoading(false);

    if (error) {
      toast.error("EMAIL HOẶC MẬT KHẨU KHÔNG CHÍNH XÁC.");
      // Track failure for IP blocking
      fetch("/api/auth/track-failure", { method: "POST" }).catch(() => {});
      return;
    }

    toast.success("CHÀO MỪNG BẠN TRỞ LẠI!");
    router.push("/");
    router.refresh();
  };

  return (
    <div className="flex min-h-[85vh] items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-2 lg:gap-12">

        {/* Left side - branding */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="hidden flex-col justify-center lg:flex"
        >
          <div className="space-y-6">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
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
                CHÀO MỪNG<br />ĐẾN VỚI <span className="ff-highlight">AREX</span>
              </h2>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
                Cổng thông tin cộng đồng Free Fire hàng đầu. Cập nhật sự kiện, tin tức Esports và nội dung cộng đồng mỗi ngày.
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

        {/* Right side - form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative"
        >
          <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/6 blur-[100px] dark:bg-amber-500/6" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-primary/4 blur-[100px] dark:bg-amber-400/4" />

          <section className="relative z-10 rounded-3xl border border-border/50 bg-card/90 p-8 shadow-[0_32px_80px_rgba(2,6,23,0.08)] backdrop-blur-2xl md:p-10">
            <div className="mb-8 text-center space-y-3">
              <div className="lg:hidden mb-4">
                <Image
                  src={siteConfig.favicon}
                  alt="Arex"
                  width={56}
                  height={56}
                  className="mx-auto rounded-2xl"
                />
              </div>
              <h1 className="font-heading text-2xl font-bold uppercase tracking-[0.06em] text-foreground md:text-3xl">
                ĐĂNG NHẬP
              </h1>
              <p className="text-sm text-muted-foreground">
                Đăng nhập để trải nghiệm đầy đủ nội dung cộng đồng
              </p>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Email</label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  placeholder="you@email.com"
                  className="h-12 rounded-xl border-border/60 bg-background/60 text-foreground placeholder:text-muted-foreground/50"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Mật khẩu</label>
                <div className="relative">
                  <Input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="h-12 rounded-xl border-border/60 bg-background/60 pr-11 text-foreground placeholder:text-muted-foreground/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <Button type="submit" disabled={loading} className="h-12 w-full rounded-xl text-sm font-bold tracking-wide">
                {loading ? "ĐANG ĐĂNG NHẬP..." : "ĐĂNG NHẬP"}
              </Button>
            </form>

            <div className="mt-5 text-center text-sm text-muted-foreground">
              Chưa có tài khoản?{" "}
              <Link href="/register" className="font-semibold text-primary hover:underline dark:text-amber-400">
                Đăng ký miễn phí
              </Link>
            </div>
          </section>
        </motion.div>
      </div>
    </div>
  );
}
