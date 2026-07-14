import type { Metadata } from "next";
import { History, Rocket } from "lucide-react";
import { siteConfig } from "@/lib/constants/site";
import { SectionHeading } from "@/components/common/section-heading";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { CHANGELOG, CHANGE_META } from "@/lib/data/changelog";

export const metadata: Metadata = {
  title: "Cập nhật & Phiên bản — Arex Network",
  description:
    "Lịch sử cập nhật cổng cộng đồng Free Fire Arex: tính năng mới, cải tiến và sửa lỗi qua từng phiên bản.",
  alternates: { canonical: `${siteConfig.url}/cap-nhat` },
};

export default function ChangelogPublicPage() {
  return (
    <main className="container-main my-8 max-w-2xl space-y-8">
      <Breadcrumbs items={[{ name: "Cập nhật", href: "/cap-nhat" }]} />

      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <History className="size-5" />
        </div>
        <SectionHeading title="Cập nhật & Phiên bản" eyebrow="Có gì mới" align="left" />
      </div>

      <div className="space-y-5">
        {CHANGELOG.map((entry, idx) => (
          <div key={entry.version} className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {idx === 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-primary">
                  <Rocket className="size-3" /> Mới nhất
                </span>
              )}
              <h2 className="font-heading text-lg font-black text-foreground">v{entry.version}</h2>
              <span className="text-xs text-muted-foreground">
                {new Date(entry.date).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}
              </span>
            </div>
            <ul className="space-y-2">
              {entry.changes.map((c, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm">
                  <span className={`mt-0.5 shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase ${CHANGE_META[c.type].cls}`}>
                    {CHANGE_META[c.type].label}
                  </span>
                  <span className="text-foreground/90">{c.text}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <p className="text-center text-xs text-muted-foreground/70">
        Theo dõi trang này để biết tính năng mới của Arex nhé!
      </p>
    </main>
  );
}
