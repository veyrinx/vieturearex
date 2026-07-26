"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { siteConfig } from "@/lib/constants/site";
import { createClient } from "@/lib/supabase/client";
import { SocialAuthButtons } from "@/components/auth/social-auth-buttons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Eye, EyeOff, Users, Bell, MessageSquare, CalendarDays,
  CheckCircle2, AlertCircle, Check, X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Strength = 0 | 1 | 2 | 3 | 4;

function getStrength(pw: string): Strength {
  if (pw.length === 0) return 0;
  if (pw.length < 6)   return 1;
  let score = 1;
  if (pw.length >= 10)              score++;
  if (/[A-Z]/.test(pw))            score++;
  if (/[0-9]/.test(pw))            score++;
  if (/[^A-Za-z0-9]/.test(pw))    score++;
  return Math.min(4, score) as Strength;
}

const STRENGTH_LABELS: Record<Strength, string> = {
  0: "",
  1: "Quá ngắn",
  2: "Yếu",
  3: "Trung bình",
  4: "Mạnh",
};

const STRENGTH_COLORS: Record<Strength, string> = {
  0: "",
  1: "bg-destructive",
  2: "bg-orange-500",
  3: "bg-yellow-500",
  4: "bg-green-500",
};

const STRENGTH_TEXT_COLORS: Record<Strength, string> = {
  0: "",
  1: "text-destructive",
  2: "text-orange-500",
  3: "text-yellow-500",
  4: "text-green-500",
};

function PasswordStrengthBar({ password }: { password: string }) {
  const strength = useMemo(() => getStrength(password), [password]);
  if (!password) return null;
  return (
    <div className="space-y-1.5">
      <div className="flex gap-1">
        {([1, 2, 3, 4] as Strength[]).map((level) => (
          <div
            key={level}
            className={cn(
              "h-1 flex-1 rounded-full transition-all duration-300",
              strength >= level ? STRENGTH_COLORS[strength] : "bg-border/50",
            )}
          />
        ))}
      </div>
      <p className={cn("text-[11px] font-semibold", STRENGTH_TEXT_COLORS[strength])}>
        {STRENGTH_LABELS[strength]}
      </p>
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <AnimatePresence>
      <motion.p
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        className="flex items-center gap-1 text-[11px] font-medium text-destructive"
      >
        <AlertCircle size={11} />
        {message}
      </motion.p>
    </AnimatePresence>
  );
}

function validateDisplayName(v: string) {
  if (!v.trim()) return "Vui lòng nhập tên hiển thị.";
  if (v.trim().length < 2) return "Tên tối thiểu 2 ký tự.";
  if (v.trim().length > 60) return "Tên tối đa 60 ký tự.";
  return "";
}

function validateEmail(v: string) {
  if (!v.trim()) return "Vui lòng nhập email.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())) return "Email không đúng định dạng.";
  return "";
}

function validatePassword(v: string) {
  if (!v) return "Vui lòng nhập mật khẩu.";
  if (v.length < 6) return "Mật khẩu tối thiểu 6 ký tự.";
  return "";
}

export default function UserRegisterPage() {
  const router = useRouter();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail]             = useState("");
  const [password, setPassword]       = useState("");
  const [confirm, setConfirm]         = useState("");

  const [showPw, setShowPw]           = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading]         = useState(false);
  const [registered, setRegistered]   = useState(false);

  // touched state — only show errors after user has interacted
  const [touched, setTouched] = useState({
    displayName: false, email: false, password: false, confirm: false,
  });
  const touch = (field: keyof typeof touched) =>
    setTouched((t) => ({ ...t, [field]: true }));

  const errors = {
    displayName: touched.displayName ? validateDisplayName(displayName) : "",
    email:       touched.email       ? validateEmail(email)             : "",
    password:    touched.password    ? validatePassword(password)       : "",
    confirm:     touched.confirm && confirm && password !== confirm
                   ? "Mật khẩu xác nhận không khớp."
                   : "",
  };

  const passwordStrength = useMemo(() => getStrength(password), [password]);
  const confirmMatch     = confirm.length > 0 && confirm === password;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ displayName: true, email: true, password: true, confirm: true });

    const nameErr  = validateDisplayName(displayName);
    const emailErr = validateEmail(email);
    const pwErr    = validatePassword(password);

    if (nameErr || emailErr || pwErr) return;
    if (password !== confirm) {
      toast.error("Mật khẩu xác nhận không khớp.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/user/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          display_name: displayName.trim(),
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Đăng ký thất bại.");
        return;
      }

      // Auto-login
      const supabase = createClient();
      if (supabase) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });
        if (!signInError) {
          toast.success("Tạo tài khoản thành công! Chào mừng bạn đến với Arex.");
          router.push("/setup?next=/");
          router.refresh();
          return;
        }
      }
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
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-green-500/10">
            <CheckCircle2 className="size-7 text-green-500" />
          </div>
          <h2 className="font-heading text-2xl font-black uppercase tracking-[0.06em] text-foreground">
            Đăng ký thành công
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Tài khoản của bạn đã được tạo. Vui lòng đăng nhập để tiếp tục.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline dark:text-amber-400"
          >
            Đăng nhập ngay →
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
                { icon: Bell,          text: "Nhận thông báo sự kiện mới" },
                { icon: Users,         text: "Kết nối cộng đồng Free Fire" },
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
              <h1 className="font-heading text-2xl font-black uppercase tracking-[0.06em] text-foreground md:text-3xl">
                TẠO TÀI KHOẢN
              </h1>
              <p className="text-sm text-muted-foreground">Miễn phí · Không cần xác minh email</p>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">

              {/* Display name */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Tên hiển thị
                  </label>
                  <span className={cn(
                    "text-[11px] tabular-nums transition-colors",
                    displayName.length > 50 ? "text-orange-500" : "text-muted-foreground/50",
                  )}>
                    {displayName.length}/60
                  </span>
                </div>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  onBlur={() => touch("displayName")}
                  placeholder="Tên của bạn"
                  maxLength={60}
                  className={cn(
                    "h-12 rounded-xl border-border/60 bg-background/60 text-foreground placeholder:text-muted-foreground/50 transition-colors",
                    errors.displayName && "border-destructive/60 focus-visible:ring-destructive/30",
                  )}
                />
                <FieldError message={errors.displayName} />
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Email</label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => touch("email")}
                  type="email"
                  placeholder="you@gmail.com"
                  autoComplete="email"
                  className={cn(
                    "h-12 rounded-xl border-border/60 bg-background/60 text-foreground placeholder:text-muted-foreground/50 transition-colors",
                    errors.email && "border-destructive/60 focus-visible:ring-destructive/30",
                  )}
                />
                <FieldError message={errors.email} />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Mật khẩu</label>
                <div className="relative">
                  <Input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={() => touch("password")}
                    type={showPw ? "text" : "password"}
                    placeholder="Tối thiểu 6 ký tự"
                    autoComplete="new-password"
                    className={cn(
                      "h-12 rounded-xl border-border/60 bg-background/60 pr-11 text-foreground placeholder:text-muted-foreground/50 transition-colors",
                      errors.password && "border-destructive/60 focus-visible:ring-destructive/30",
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                    tabIndex={-1}
                    aria-label={showPw ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  >
                    {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.password
                  ? <FieldError message={errors.password} />
                  : <PasswordStrengthBar password={password} />
                }
              </div>

              {/* Confirm password */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Xác nhận mật khẩu
                </label>
                <div className="relative">
                  <Input
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    onBlur={() => touch("confirm")}
                    type={showConfirm ? "text" : "password"}
                    placeholder="Nhập lại mật khẩu"
                    autoComplete="new-password"
                    className={cn(
                      "h-12 rounded-xl border-border/60 bg-background/60 pr-20 text-foreground placeholder:text-muted-foreground/50 transition-colors",
                      errors.confirm && "border-destructive/60 focus-visible:ring-destructive/30",
                      confirmMatch  && "border-green-500/60",
                    )}
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {confirm.length > 0 && (
                      <span className={cn(
                        "flex size-5 items-center justify-center rounded-full",
                        confirmMatch ? "text-green-500" : "text-destructive",
                      )}>
                        {confirmMatch ? <Check size={13} /> : <X size={13} />}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                      aria-label={showConfirm ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    >
                      {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <FieldError message={errors.confirm} />
              </div>

              {/* Password requirements hint */}
              {password.length > 0 && passwordStrength < 3 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="rounded-xl border border-border/40 bg-muted/30 px-3.5 py-3 space-y-1.5"
                >
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                    Để mật khẩu mạnh hơn:
                  </p>
                  {[
                    { ok: password.length >= 10, label: "Ít nhất 10 ký tự" },
                    { ok: /[A-Z]/.test(password), label: "Có chữ hoa (A-Z)" },
                    { ok: /[0-9]/.test(password), label: "Có chữ số (0-9)" },
                    { ok: /[^A-Za-z0-9]/.test(password), label: "Có ký tự đặc biệt (!@#...)" },
                  ].map(({ ok, label }) => (
                    <div key={label} className={cn("flex items-center gap-2 text-[11px]", ok ? "text-green-500" : "text-muted-foreground")}>
                      {ok ? <Check size={11} /> : <div className="size-[11px] rounded-full border border-current opacity-40" />}
                      {label}
                    </div>
                  ))}
                </motion.div>
              )}

              <p className="text-[11px] text-muted-foreground">
                Bằng cách đăng ký, bạn đồng ý với{" "}
                <Link href="/terms-of-use" className="underline hover:text-primary transition-colors">
                  Điều khoản sử dụng
                </Link>
                {" "}và{" "}
                <Link href="/privacy-policy" className="underline hover:text-primary transition-colors">
                  Chính sách bảo mật
                </Link>.
              </p>

              <Button
                type="submit"
                disabled={loading}
                className="h-12 w-full rounded-xl text-sm font-bold tracking-wide"
              >
                {loading ? "ĐANG TẠO TÀI KHOẢN..." : "TẠO TÀI KHOẢN MIỄN PHÍ"}
              </Button>
            </form>

            <SocialAuthButtons className="mt-6" />

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
