"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff } from "lucide-react";

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

    // Restore recovery session từ sessionStorage
    const accessToken = sessionStorage.getItem("recovery_access_token");
    const refreshToken = sessionStorage.getItem("recovery_refresh_token");
    if (accessToken && refreshToken) {
      await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
      sessionStorage.removeItem("recovery_access_token");
      sessionStorage.removeItem("recovery_refresh_token");
    }

    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    setLoading(false);

    if (error) {
      toast.error("ĐỔI MẬT KHẨU THẤT BẠI. CÓ THỂ MÃ XÁC NHẬN ĐÃ HẾT HẠN.");
      return;
    }

    toast.success("ĐỔI MẬT KHẨU THÀNH CÔNG! ĐANG CHUYỂN VÀO HỆ THỐNG.");
    // After changing password, they are already authenticated, so go to admin.
    window.setTimeout(() => {
      router.push("/admin");
    }, 1000);
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-[0_20px_60px_rgba(2,6,23,0.15)] relative">
        <div className="mb-6 text-center mt-2">
          <div className="flex flex-col items-center">
            <h1 className="font-heading text-2xl font-bold uppercase tracking-[0.08em] text-foreground">
              ĐỔI MẬT KHẨU
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              NHẬP MẬT KHẨU BẢO MẬT MỚI CHO TÀI KHOẢN CỦA BẠN
            </p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 mt-8">
          <PasswordInput
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="MẬT KHẨU MỚI"
            showPassword={showPassword}
            onToggleShowPassword={() => setShowPassword(!showPassword)}
          />
          <PasswordInput
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="NHẬP LẠI MẬT KHẨU MỚI"
            showPassword={showConfirmPassword}
            onToggleShowPassword={() => setShowConfirmPassword(!showConfirmPassword)}
          />
          <Button type="submit" disabled={loading} className="h-11 w-full rounded-xl uppercase tracking-[0.08em] font-bold">
            {loading ? "ĐANG LƯU..." : "MỞ KHÓA VÀ LƯU"}
          </Button>
        </form>
      </section>
    </main>
  );
}
