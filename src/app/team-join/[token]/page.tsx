"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShieldCheck } from "lucide-react";

export default function TeamJoinPage({ params }: { params: { token: string } }) {
  const router = useRouter();
  const { token } = params;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password || !displayName.trim()) {
      toast.error("Vui lòng điền đầy đủ thông tin.");
      return;
    }
    if (password !== confirmPwd) {
      toast.error("Mật khẩu xác nhận không khớp.");
      return;
    }
    if (password.length < 6) {
      toast.error("Mật khẩu tối thiểu 6 ký tự.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/team-join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          email: email.trim().toLowerCase(),
          password,
          display_name: displayName.trim(),
        }),
      });
      const data = (await res.json()) as { error?: string; status?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Không thể gửi yêu cầu.");
        return;
      }
      setDone(true);
    } catch {
      toast.error("Lỗi mạng.");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-10">
        <section className="w-full max-w-md rounded-3xl border border-border bg-card p-10 text-center shadow-xl">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-emerald-500/10">
            <ShieldCheck className="size-7 text-emerald-500" />
          </div>
          <h1 className="font-heading text-xl font-bold uppercase tracking-[0.06em]">
            Đã gửi yêu cầu
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Tài khoản của bạn đã được tạo và đang chờ bộ phận IT duyệt. Bạn sẽ được thông báo khi hồ sơ được phê duyệt.
          </p>
          <Button onClick={() => router.push("/")} className="mt-6 rounded-xl">Về trang chủ</Button>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-xl">
        <div className="mb-6 text-center">
          <h1 className="font-heading text-2xl font-bold uppercase tracking-[0.06em]">
            Tham gia team Arex
          </h1>
          <p className="mt-2 text-xs text-muted-foreground">
            Bạn được mời tạo tài khoản team. Sau khi gửi, IT sẽ duyệt hồ sơ.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Tên hiển thị</label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={60} className="h-11 rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Email</label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="h-11 rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Mật khẩu</label>
            <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" className="h-11 rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Xác nhận mật khẩu</label>
            <Input value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} type="password" className="h-11 rounded-xl" />
          </div>
          <Button type="submit" disabled={loading} className="h-11 w-full rounded-xl">
            {loading ? "Đang gửi..." : "Gửi yêu cầu"}
          </Button>
        </form>
      </section>
    </main>
  );
}
