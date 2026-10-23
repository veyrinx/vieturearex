"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Bookmark, CheckCircle2, Circle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Progress = { signedIn: boolean; read: string[]; bookmarked: string[] };

let progressCache: Promise<Progress> | null = null;
function loadProgress(): Promise<Progress> {
  progressCache ??= fetch("/api/craftland/academy/progress")
    .then((r) => (r.ok ? r.json() : { signedIn: false, read: [], bookmarked: [] }))
    .catch(() => ({ signedIn: false, read: [], bookmarked: [] }));
  return progressCache;
}

/** Dấu ✓ bên cạnh bài đã đọc trong danh sách. */
export function ReadMark({ articleId }: { articleId: string }) {
  const [read, setRead] = useState(false);
  useEffect(() => {
    loadProgress().then((p) => setRead(p.read.includes(articleId)));
  }, [articleId]);
  return read ? (
    <CheckCircle2 className="size-4 shrink-0 text-emerald-500" aria-label="Đã đọc" />
  ) : (
    <Circle className="size-4 shrink-0 text-muted-foreground/40" aria-hidden />
  );
}

/** Thanh tiến độ: số bài đã đọc / tổng. Chỉ hiện khi đã đăng nhập. */
export function ProgressSummary({ articleIds }: { articleIds: string[] }) {
  const [p, setP] = useState<Progress | null>(null);
  useEffect(() => {
    loadProgress().then(setP);
  }, []);
  if (!p?.signedIn || articleIds.length === 0) return null;
  const done = articleIds.filter((id) => p.read.includes(id)).length;
  const pct = Math.round((done / articleIds.length) * 100);
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-semibold">Tiến độ học</span>
        <span className="tabular-nums text-muted-foreground">{done}/{articleIds.length} bài · {pct}%</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-emerald-500 transition-[width]" style={{ width: `${pct}%` }} />
      </div>
      {p.bookmarked.length > 0 && <p className="mt-2 text-xs text-muted-foreground">{p.bookmarked.length} bài đã lưu</p>}
    </div>
  );
}

export function ArticleActions({ articleId }: { articleId: string }) {
  const [state, setState] = useState<{ signedIn: boolean; read: boolean; bookmarked: boolean } | null>(null);
  const [busy, setBusy] = useState<"read" | "bookmark" | null>(null);

  useEffect(() => {
    fetch(`/api/craftland/academy/${articleId}/progress`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setState(d ?? { signedIn: false, read: false, bookmarked: false }))
      .catch(() => setState({ signedIn: false, read: false, bookmarked: false }));
  }, [articleId]);

  const update = async (patch: { read?: boolean; bookmarked?: boolean }, kind: "read" | "bookmark") => {
    if (!state?.signedIn) {
      toast.error("Đăng nhập để lưu tiến độ học.");
      return;
    }
    setBusy(kind);
    try {
      const res = await fetch(`/api/craftland/academy/${articleId}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Không lưu được.");
      setState({ signedIn: true, read: data.read, bookmarked: data.bookmarked });
      progressCache = null;
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const btn = "inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-sm font-medium transition hover:border-primary/40 disabled:opacity-60";
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" disabled={!state || busy !== null} onClick={() => update({ read: !state?.read }, "read")} aria-pressed={!!state?.read} className={cn(btn, state?.read && "border-emerald-500/40 text-emerald-600 dark:text-emerald-400")}>
        {busy === "read" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <CheckCircle2 className="size-4" aria-hidden />}
        {state?.read ? "Đã đọc" : "Đánh dấu đã đọc"}
      </button>
      <button type="button" disabled={!state || busy !== null} onClick={() => update({ bookmarked: !state?.bookmarked }, "bookmark")} aria-pressed={!!state?.bookmarked} className={btn}>
        {busy === "bookmark" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Bookmark className={cn("size-4", state?.bookmarked && "fill-current")} aria-hidden />}
        {state?.bookmarked ? "Đã lưu" : "Lưu bài"}
      </button>
    </div>
  );
}

/** Gắn nút "Sao chép" cho mọi khối <pre> trong bài viết. */
export function CodeCopyEnhancer({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const added: HTMLButtonElement[] = [];
    root.querySelectorAll("pre").forEach((pre) => {
      if (pre.dataset.copy) return;
      pre.dataset.copy = "1";
      pre.style.position = "relative";
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = "Sao chép";
      btn.className = "absolute right-2 top-2 rounded-md border border-white/20 bg-black/40 px-2 py-0.5 text-[11px] font-semibold text-white hover:bg-black/60";
      btn.addEventListener("click", async () => {
        try {
          const text = Array.from(pre.childNodes).filter((n) => n !== btn).map((n) => n.textContent ?? "").join("");
          await navigator.clipboard.writeText(text);
          btn.textContent = "Đã chép";
          setTimeout(() => (btn.textContent = "Sao chép"), 1500);
        } catch {
          toast.error("Không sao chép được.");
        }
      });
      pre.appendChild(btn);
      added.push(btn);
    });
    return () =>
      added.forEach((b) => {
        delete (b.parentElement as HTMLElement | null)?.dataset.copy;
        b.remove();
      });
  }, []);
  return <div ref={ref}>{children}</div>;
}
