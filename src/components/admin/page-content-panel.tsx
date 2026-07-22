"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { FileText, Save, Loader2, ExternalLink, RotateCcw, Scale } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { EDITABLE_PAGES, type PageContent } from "@/lib/constants/page-content";

export function PageContentPanel({
  initialItems,
  canEdit,
}: {
  initialItems: PageContent[];
  canEdit: boolean;
}) {
  // Map key -> HTML, trống nghĩa là dùng bản mặc định trong code.
  const [bodies, setBodies] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    for (const p of EDITABLE_PAGES) m[p.key] = "";
    for (const i of initialItems) m[i.key] = i.body;
    return m;
  });
  const [active, setActive] = useState(EDITABLE_PAGES[0].key);
  const [saving, setSaving] = useState(false);

  const page = useMemo(() => EDITABLE_PAGES.find((p) => p.key === active)!, [active]);
  const overridden = bodies[active]?.trim().length > 0;

  async function save() {
    setSaving(true);
    try {
      const items = EDITABLE_PAGES
        .map((p) => ({ key: p.key, body: bodies[p.key] ?? "" }))
        .filter((i) => i.body.trim());
      const res = await fetch("/api/admin/page-content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(json.error ?? "Lưu thất bại."); return; }
      toast.success("Đã lưu nội dung trang.");
    } catch { toast.error("Lỗi mạng."); }
    finally { setSaving(false); }
  }

  function resetToDefault() {
    setBodies((prev) => ({ ...prev, [active]: "" }));
    toast.info("Đã xoá nội dung tuỳ chỉnh — nhớ bấm Lưu để áp dụng.");
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-amber-400/10 dark:text-amber-400">
            <FileText className="size-5" />
          </div>
          <div>
            <h1 className="font-heading text-xl font-black uppercase tracking-tight text-foreground">Nội Dung Trang</h1>
            <p className="text-xs text-muted-foreground">
              Sửa nội dung các trang tĩnh. {canEdit ? "Để trống = dùng bản mặc định trong code." : "Bạn chỉ có quyền xem."}
            </p>
          </div>
        </div>
        <Link href={page.slug} target="_blank" className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground">
          <ExternalLink className="size-3.5" /> Xem {page.label}
        </Link>
      </div>

      {/* Chọn trang */}
      <div className="flex flex-wrap gap-1.5">
        {EDITABLE_PAGES.map((p) => {
          const isActive = p.key === active;
          const hasCustom = bodies[p.key]?.trim().length > 0;
          return (
            <button
              key={p.key}
              onClick={() => setActive(p.key)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-colors",
                isActive ? "bg-primary text-primary-foreground shadow" : "border border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {p.note && <Scale className="size-3" />}
              {p.label}
              {/* Chấm báo trang đang dùng nội dung tuỳ chỉnh */}
              <span className={cn("size-1.5 rounded-full", hasCustom ? "bg-emerald-400" : "bg-transparent")} />
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-heading text-base font-black text-foreground">{page.label}</h2>
            <p className="text-[11px] text-muted-foreground">
              {overridden
                ? "Đang dùng nội dung tuỳ chỉnh — sẽ thay thế bản trong code."
                : "Đang dùng bản mặc định trong code. Nhập nội dung để thay thế."}
            </p>
          </div>
          {canEdit && overridden && (
            <button onClick={resetToDefault} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground">
              <RotateCcw className="size-3.5" /> Về bản mặc định
            </button>
          )}
        </div>

        {page.note && (
          <p className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/[0.06] px-3 py-2 text-[11px] leading-relaxed text-foreground">
            <b>Cân nhắc kỹ:</b> trang này đang có giao diện riêng (mục lục neo, bảng, thẻ mục).
            Nhập nội dung ở đây sẽ <b>thay toàn bộ giao diện đó bằng văn bản thường</b> — đẹp hơn thì không,
            nhưng sửa nhanh hơn. Để trống để giữ nguyên bản thiết kế.
            Ngoài ra đây là văn bản pháp lý, nên nhờ người phụ trách rà lại trước khi lưu.
          </p>
        )}

        {canEdit ? (
          <RichTextEditor
            key={active}
            value={bodies[active] ?? ""}
            onChange={(html) => setBodies((prev) => ({ ...prev, [active]: html }))}
            placeholder="Để trống để giữ nội dung mặc định..."
          />
        ) : (
          <div
            className="prose prose-sm max-w-none rounded-lg border border-border p-3 dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: bodies[active] || "<p class='text-muted-foreground'>Đang dùng bản mặc định.</p>" }}
          />
        )}
      </div>

      {canEdit && (
        <button onClick={save} disabled={saving} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60">
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Lưu thay đổi
        </button>
      )}
    </div>
  );
}
