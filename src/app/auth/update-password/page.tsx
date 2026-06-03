"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, KeyRound, Loader2, CheckCircle2 } from "lucide-react";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const PasswordInput = ({
    value,
    onChange,
    placeholder,
    showPassword,
    onToggleShowPassword
  }: {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder: string;
    showPassword: boolean;
    onToggleShowPassword: () => void;
  }) => (
    <div className="relative">
      <Input
        value={value}
        onChange={onChange}
        type={showPassword ? "text" : "password"}
        required
        placeholder={placeholder}
        className="h-11 rounded-xl placeholder:uppercase placeholder:font-medium tracking-[0.1em] pr-10"
        autoComplete="new-password"
      />
      <button
        type="button"
        onClick={onToggleShowPassword}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors z-10 p-1"
        aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
      >
        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (password !== confirmPassword) {
      toast.error("MẬT KHẨU KHÔNG KHỚP. VUI LÒNG KIỂM TRA LẠI.");
      return;
    }

    if (password.length < 6) {
      toast.error("MẬT KHẨU PHẢI CÓ TỪ 6 KÝ TỰ TRỞ LÊN.");
      return;
    }

    setLoading(true);

    const supabase = createClient();
    if (!supabase) {
      setLoading(false);
      toast.error("KHÔNG THỂ KẾT NỐI MÁY CHỦ.");
      return;
    }

    // Restore recovery session: OTP flow → sessionStorage; link flow → hash handled by SDK
    const accessToken = sessionStorage.getItem("recovery_access_token");
    const refreshToken = sessionStorage.getItem("recovery_refresh_token");
    if (accessToken && refreshToken) {
      await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
      sessionStorage.removeItem("recovery_access_token");
      sessionStorage.removeItem("recovery_refresh_token");
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("PHIÊN ĐÃ HẾT HẠN. VUI LÒNG YÊU CẦU ĐẶT LẠI MẬT KHẨU MỚI.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });

    setLoading(false);

    if (error) {
      toast.error("ĐỔI MẬT KHẨU THẤT BẠI. CÓ THỂ MÃ XÁC NHẬN ĐÃ HẾT HẠN.");
      return;
    }

    toast.success("ĐỔI MẬT KHẨU THÀNH CÔNG!");
    // Check user role to redirect correctly
    const ADMIN_ROLES = ["super_admin", "admin", "it", "manager", "support"];
    let destination = "/";
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        const { data: profile } = await supabase
          .from("users")
          .select("role")
          .eq("id", currentUser.id)
          .maybeSingle() as { data: { role: string } | null };
        if (profile?.role && ADMIN_ROLES.includes(profile.role)) {
          destination = "/admin";
        }
      }
    } catch { /* fall back to homepage */ }
    window.setTimeout(() => {
      router.push(destination);
    }, 1000);
  };

  const passwordsMatch = password === confirmPassword && password.length > 0;
  const passwordValid = password.length >= 6;
  const canSubmit = passwordValid && passwordsMatch;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/4 top-1/4 size-[400px] rounded-full bg-primary/8 blur-[120px] dark:bg-amber-400/6" />
        <div className="absolute right-1/4 bottom-1/4 size-[300px] rounded-full bg-violet-500/5 blur-[100px]" />
      </div>

      <section className="relative w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-xl">
        <div className="mb-6 text-center space-y-3">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 dark:bg-amber-400/10">
            <KeyRound className="size-7 text-primary dark:text-amber-400" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary dark:text-amber-400">Bảo mật</p>
            <h1 className="mt-1 font-heading text-2xl font-bold uppercase tracking-[0.06em] text-foreground">
              Đổi Mật Khẩu
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Nhập mật khẩu bảo mật mới cho tài khoản của bạn
            </p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Mật khẩu mới</label>
            <PasswordInput
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Tối thiểu 6 ký tự"
              showPassword={showPassword}
              onToggleShowPassword={() => setShowPassword(!showPassword)}
            />
            {password && (
              <p className={`text-[11px] font-semibold ${passwordValid ? "text-emerald-500" : "text-red-400"}`}>
                {passwordValid ? "✓ Mật khẩu đủ mạnh" : `Cần thêm ${6 - password.length} ký tự`}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Xác nhận mật khẩu</label>
            <PasswordInput
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Nhập lại mật khẩu"
              showPassword={showConfirmPassword}
              onToggleShowPassword={() => setShowConfirmPassword(!showConfirmPassword)}
            />
            {confirmPassword && (
              <p className={`flex items-center gap-1 text-[11px] font-semibold ${passwordsMatch ? "text-emerald-500" : "text-red-400"}`}>
                {passwordsMatch ? <><CheckCircle2 className="size-3" /> Mật khẩu khớp</> : "✗ Mật khẩu không khớp"}
              </p>
            )}
          </div>

          <Button type="submit" disabled={loading || !canSubmit}
            className="h-12 w-full rounded-xl uppercase tracking-[0.08em] font-bold gap-2 shadow-lg shadow-primary/20 dark:shadow-amber-400/15">
            {loading ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
            {loading ? "Đang lưu..." : "Mở khóa và lưu"}
          </Button>
        </form>
      </section>
    </main>
  );
}
