"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, BookOpenText, Info } from "lucide-react";
import { WikiEditor } from "@/components/wiki/wiki-editor";

export default function CreateWikiPage() {
  const router = useRouter();

  function handleSuccess(slug: string) {
    router.push(`/wiki/${slug}`);
  }

  return (
    <div className="mx-auto max-w-4xl py-8 md:py-12 space-y-8">
      {/* Back */}
      <Link
        href="/wiki"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-4" />
        Quay lại Wiki
      </Link>

      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-7">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-500/8 via-transparent to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
        <div className="relative flex items-center gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15">
            <BookOpenText className="size-6 text-emerald-600 dark:text-emerald-400" />
          </span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600 dark:text-emerald-400">Arex Wiki</p>
            <h1 className="font-heading text-2xl font-black uppercase tracking-tight text-foreground md:text-3xl">
              Viết Bài Wiki
            </h1>
            <p className="text-sm text-muted-foreground">Chia sẻ kiến thức của bạn với cộng đồng</p>
          </div>
        </div>
      </div>

      {/* Guidelines */}
      <div className="flex gap-3 rounded-2xl border border-blue-500/20 bg-blue-500/8 p-4">
        <Info className="mt-0.5 size-4 shrink-0 text-blue-500" />
        <div className="space-y-1 text-sm text-muted-foreground">
          <p className="font-semibold text-foreground">Hướng dẫn đóng góp Wiki</p>
          <ul className="list-disc space-y-0.5 pl-4 text-xs">
            <li>Nội dung phải liên quan đến game Free Fire</li>
            <li>Giữ thông tin chính xác, trung lập và có thể kiểm chứng</li>
            <li>Không spam, quảng cáo hoặc nội dung không phù hợp</li>
            <li>Bạn sẽ nhận +10 điểm cộng đồng cho mỗi bài wiki được đăng</li>
            <li>Bài viết có thể được cộng đồng chỉnh sửa để cải thiện chất lượng</li>
          </ul>
        </div>
      </div>

      {/* Editor */}
      <div className="rounded-3xl border border-border bg-card p-6 md:p-8">
        <WikiEditor onSuccess={handleSuccess} />
      </div>
    </div>
  );
}
