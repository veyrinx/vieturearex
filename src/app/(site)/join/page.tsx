"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Trophy, Users, BarChart2, Bell, Swords } from "lucide-react";
import { Button } from "@/components/ui/button";

type Tournament = { id: string; name: string; slug: string; banner_url: string | null };

function JoinContent() {
  const searchParams = useSearchParams();
  const slug = searchParams.get("t") ?? "";
  const [tournament, setTournament] = useState<Tournament | null>(null);

  useEffect(() => {
    if (!slug) return;
    fetch("/api/tms/tournaments")
      .then((r) => r.json())
      .then((list: Tournament[]) => {
        const found = list.find((t) => t.slug === slug) ?? null;
        setTournament(found);
      })
      .catch(() => {});
  }, [slug]);

  const submitNext = slug ? `/tournaments/${slug}/submit` : "/";
  const loginHref = `/login?next=${encodeURIComponent(submitNext)}`;
  const registerHref = `/register?next=${encodeURIComponent(submitNext)}`;

  return (
    <div className="py-10 space-y-8">
      {tournament?.banner_url && (
        <div className="rounded-2xl overflow-hidden aspect-[21/5] bg-muted">
          <img src={tournament.banner_url} alt={tournament.name} className="w-full h-full object-cover" />
        </div>
      )}

      <div className="text-center space-y-3">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 dark:bg-amber-400/10">
          <Trophy className="size-7 text-primary dark:text-amber-400" />
        </div>
        <h1 className="font-heading text-3xl font-black uppercase tracking-[0.06em]">
          {tournament ? `Tham gia ${tournament.name}` : "Tham gia Arex TMS"}
        </h1>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Đăng nhập hoặc tạo tài khoản miễn phí để tham gia giải đấu và nộp kết quả thi đấu.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 max-w-xl mx-auto">
        <Link href={loginHref}>
          <div className="rounded-2xl border border-border bg-card p-5 space-y-2 hover:border-primary/40 transition-colors cursor-pointer h-full">
            <p className="font-heading text-sm font-bold uppercase tracking-widest text-muted-foreground">Đã có tài khoản</p>
            <p className="text-lg font-black">Đăng nhập →</p>
            <p className="text-xs text-muted-foreground">Vào thẳng giải đấu ngay</p>
          </div>
        </Link>
        <Link href={registerHref}>
          <div className="rounded-2xl border border-primary/30 bg-primary/5 dark:border-amber-400/30 dark:bg-amber-400/5 p-5 space-y-2 hover:border-primary/60 dark:hover:border-amber-400/60 transition-colors cursor-pointer h-full">
            <p className="font-heading text-sm font-bold uppercase tracking-widest text-muted-foreground">Chưa có tài khoản</p>
            <p className="text-lg font-black text-primary dark:text-amber-400">Đăng ký miễn phí →</p>
            <p className="text-xs text-muted-foreground">Tạo tài khoản, chỉ 1 phút</p>
          </div>
        </Link>
      </div>

      <div className="max-w-xl mx-auto rounded-2xl border border-border bg-card p-5 space-y-3">
        <h2 className="font-heading text-sm font-bold uppercase tracking-widest text-muted-foreground">
          Tham gia để được
        </h2>
        <div className="space-y-2.5">
          {[
            { icon: Swords, text: "Tham gia giải đấu chính thức" },
            { icon: BarChart2, text: "Theo dõi thống kê cá nhân & bảng xếp hạng" },
            { icon: Users, text: "Kết nối với cộng đồng Free Fire" },
            { icon: Bell, text: "Nhận thông báo kết quả duyệt ngay lập tức" },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-3 text-sm text-muted-foreground">
              <Icon className="size-4 text-primary dark:text-amber-400 shrink-0" />
              {text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense>
      <JoinContent />
    </Suspense>
  );
}
