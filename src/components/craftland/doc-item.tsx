import { ChevronRight } from "lucide-react";
import type { DocItem } from "@/lib/data/craftland-docs";
import { cn } from "@/lib/utils";

/** Một mục API / sự kiện. Bấm vào tên để mở chữ ký và kiểu tham số. */
export function DocItemCard({ item, defaultOpen = false }: { item: DocItem; defaultOpen?: boolean }) {
  const hasParams = (item.input?.length ?? 0) > 0 || (item.output?.length ?? 0) > 0;

  return (
    <details
      id={item.slug}
      open={defaultOpen}
      className={cn("group scroll-mt-24 rounded-xl border bg-card", item.obsolete ? "border-amber-500/40" : "border-border")}
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90 motion-reduce:transition-none" aria-hidden />
        <span className="min-w-0 flex-1 font-semibold text-foreground">
          {item.title.replace(/\s*\[Hết hạn\]\s*$/, "")}
          {item.obsolete && (
            <span className="ml-2 rounded bg-amber-500/15 px-1.5 py-0.5 align-middle text-[11px] font-semibold text-amber-700 dark:text-amber-300">
              Hết hạn
            </span>
          )}
        </span>
        {item.signature && (
          <code className="hidden max-w-[45%] truncate text-xs text-muted-foreground md:block">
            {item.signature.split("\n")[0]}
          </code>
        )}
      </summary>

      <div className="space-y-3 border-t border-border px-4 pb-4 pt-3">
        {item.obsolete && (
          <p className="text-xs text-amber-700 dark:text-amber-300">
            Garena đánh dấu mục này đã hết hạn — tránh dùng trong dự án mới.
          </p>
        )}
        {item.signature && (
          <pre className="overflow-x-auto rounded-lg bg-muted px-3 py-2 text-[13px] leading-relaxed"><code>{item.signature}</code></pre>
        )}
        {hasParams && (
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            {(["input", "output"] as const).map((k) =>
              item[k]?.length ? (
                <div key={k}>
                  <dt className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{k === "input" ? "Đầu vào" : "Trả về"}</dt>
                  <dd>
                    <ul className="space-y-0.5">
                      {item[k]!.map((p, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-foreground">{p.name}</span>
                          <code className="text-xs text-muted-foreground">{p.type}</code>
                        </li>
                      ))}
                    </ul>
                  </dd>
                </div>
              ) : null,
            )}
          </dl>
        )}
        {!item.signature && !hasParams && !item.obsolete && (
          <p className="text-sm text-muted-foreground">Mục này không có khai báo hàm.</p>
        )}
      </div>
    </details>
  );
}
