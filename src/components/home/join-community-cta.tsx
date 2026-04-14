import { Button } from "@/components/ui/button";
import { siteConfig } from "@/lib/constants/site";
import { Sparkles } from "lucide-react";

export function JoinCommunityCta() {
  return (
    <section className="relative overflow-hidden rounded-[28px] border border-primary/20 bg-gradient-to-r from-primary/10 via-[#4D7CFF]/10 to-card/90 p-8 shadow-[0_24px_64px_rgba(15,23,42,0.08)] md:p-10 dark:border-primary/20 dark:from-[#EA580C]/12 dark:via-[#F7931A]/12 dark:to-[#FFD600]/10 dark:shadow-[0_0_50px_-10px_rgba(247,147,26,0.12)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(0,82,255,0.18),transparent_50%)] dark:bg-[radial-gradient(circle_at_20%_20%,rgba(247,147,26,0.18),transparent_50%)]" />
      <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <h2 className="font-heading text-2xl font-bold text-foreground md:text-3xl">
            SẴN SÀNG THAM GIA CỘNG ĐỒNG?
          </h2>
          <p className="text-sm uppercase tracking-[0.08em] text-muted-foreground md:text-base">
            KẾT NỐI CÙNG FAN, THEO DÕI LỊCH EVENT VÀ NHẬN THÔNG BÁO CẬP NHẬT MỚI NHẤT.
          </p>
        </div>
        <Button asChild size="lg" className="rounded-xl">
          <a
            href={siteConfig.links.community}
            target="_blank"
            rel="noreferrer"
          >
            <Sparkles className="mr-2 size-4" />
            THAM GIA CỘNG ĐỒNG
          </a>
        </Button>
      </div>
    </section>
  );
}
