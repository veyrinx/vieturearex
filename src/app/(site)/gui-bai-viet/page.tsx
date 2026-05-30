import type { Metadata } from "next";
import { siteConfig } from "@/lib/constants/site";
import { SubmissionForm } from "@/components/submissions/submission-form";
import { FileText, Eye, CheckCircle2, Clock } from "lucide-react";

export const metadata: Metadata = {
  title: "Gửi Bài Viết — Arex Network",
  description:
    "Chia sẻ bài viết, hướng dẫn hoặc tin tức Free Fire của bạn lên Arex Network. Ban biên tập sẽ xem xét và xuất bản nếu phù hợp.",
  alternates: { canonical: `${siteConfig.url}/gui-bai-viet` },
  openGraph: {
    title: "Gửi Bài Viết — Arex Network",
    description: "Đóng góp nội dung cho cộng đồng Free Fire Việt Nam qua Arex Network.",
    url: `${siteConfig.url}/gui-bai-viet`,
    type: "website",
    siteName: siteConfig.name,
  },
  robots: { index: true, follow: true },
};

const STEPS = [
  {
    icon: FileText,
    title: "Viết bài",
    desc: "Điền đầy đủ tiêu đề, nội dung, tóm tắt và thông tin liên lạc bên dưới.",
  },
  {
    icon: Eye,
    title: "Biên tập kiểm duyệt",
    desc: "Ban biên tập đọc và kiểm tra nội dung trong 2–5 ngày làm việc.",
  },
  {
    icon: CheckCircle2,
    title: "Xuất bản",
    desc: "Bài viết được duyệt sẽ hiển thị trên trang Tin tức với tên tác giả.",
  },
];

const GUIDELINES = [
  "Nội dung liên quan đến Free Fire, Esports, game mobile hoặc cộng đồng gaming Việt Nam.",
  "Bài viết gốc, không sao chép từ nguồn khác (hoặc phải ghi nguồn rõ ràng).",
  "Không chứa thông tin sai lệch, quảng cáo ẩn, hoặc nội dung vi phạm pháp luật.",
  "Hình ảnh có bản quyền hợp lệ hoặc từ tài nguyên miễn phí.",
  "Tối thiểu 300 từ để đảm bảo chất lượng nội dung.",
];

export default function SubmitArticlePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:py-14 space-y-10">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-8 md:p-10 text-center space-y-3">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-transparent dark:from-amber-400/6" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent dark:via-amber-400/40" />
        <p className="relative text-[10px] font-black uppercase tracking-[0.3em] text-primary dark:text-amber-400">
          Cộng đồng Arex
        </p>
        <h1 className="relative font-heading text-3xl font-black uppercase tracking-[0.04em] text-foreground md:text-4xl">
          Gửi Bài Viết
        </h1>
        <p className="mx-auto max-w-lg text-sm leading-relaxed text-muted-foreground md:text-base">
          Chia sẻ kiến thức, tin tức và câu chuyện Free Fire của bạn với hơn{" "}
          <strong className="text-foreground">50.000 người chơi</strong> mỗi tháng.
        </p>
      </div>

      {/* Steps */}
      <div className="grid gap-4 sm:grid-cols-3">
        {STEPS.map(({ icon: Icon, title, desc }, i) => (
          <div key={title} className="relative rounded-2xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-center gap-3">
              <span className="flex size-8 items-center justify-center rounded-xl bg-primary/10 dark:bg-amber-400/10">
                <Icon className="size-4 text-primary dark:text-amber-400" />
              </span>
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
                Bước {i + 1}
              </span>
            </div>
            <p className="text-sm font-bold text-foreground">{title}</p>
            <p className="text-xs leading-relaxed text-muted-foreground">{desc}</p>
          </div>
        ))}
      </div>

      {/* Guidelines */}
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 md:p-6 space-y-3">
        <div className="flex items-center gap-2.5">
          <Clock className="size-4 text-amber-500" />
          <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-600 dark:text-amber-400">
            Tiêu chí biên tập
          </p>
        </div>
        <ul className="space-y-2">
          {GUIDELINES.map((g) => (
            <li key={g} className="flex items-start gap-2.5 text-sm text-muted-foreground">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-amber-500" />
              {g}
            </li>
          ))}
        </ul>
      </div>

      {/* Form */}
      <div className="rounded-2xl border border-border bg-card p-6 md:p-8">
        <div className="mb-6 flex items-center gap-2.5">
          <span className="h-4 w-0.5 rounded-full bg-primary dark:bg-amber-400" />
          <h2 className="font-heading text-sm font-black uppercase tracking-[0.16em] text-primary dark:text-amber-400">
            Thông tin bài viết
          </h2>
        </div>
        <SubmissionForm />
      </div>

      {/* Contact note */}
      <p className="text-center text-xs text-muted-foreground/60">
        Có câu hỏi? Liên hệ{" "}
        <a href="mailto:admin@arex.tech" className="underline hover:text-foreground">
          admin@arex.tech
        </a>{" "}
        · Xem thêm{" "}
        <a href="/about" className="underline hover:text-foreground">Về chúng tôi</a>
      </p>
    </div>
  );
}
