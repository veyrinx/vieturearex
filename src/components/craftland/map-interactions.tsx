"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Check, ChevronDown, Copy, Flag, Heart, Loader2, Share2, Star } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { REPORT_REASONS } from "@/lib/constants/craftland";
import type { CraftlandEventType, CraftlandReportReason } from "@/lib/types/craftland";
import { cn } from "@/lib/utils";

function track(mapId: string, type: CraftlandEventType) {
  const src = new URLSearchParams(window.location.search).get("src");
  void fetch(`/api/craftland/maps/${mapId}/event`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, referrer: document.referrer || null, src }),
    keepalive: true,
  }).catch(() => undefined);
}

async function readError(res: Response, fallback: string) {
  const data = (await res.json().catch(() => null)) as { error?: string } | null;
  return data?.error ?? fallback;
}

/** Gửi một sự kiện "view" cho mỗi lần tải trang. Chống trùng thật nằm ở server. */
export function MapViewTracker({ mapId }: { mapId: string }) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    track(mapId, "view");
  }, [mapId]);
  return null;
}

export function CopyCodeButton({ mapId, code }: { mapId: string; code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(code);
          setCopied(true);
          toast.success("Đã sao chép mã map");
          track(mapId, "copy_code");
          setTimeout(() => setCopied(false), 2000);
        } catch {
          toast.error("Trình duyệt không cho sao chép — hãy chọn và sao chép thủ công.");
        }
      }}
      className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:brightness-110 active:scale-[0.98]"
    >
      {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
      {copied ? "Đã sao chép" : "Sao chép mã"}
    </button>
  );
}

/** Khối "Hướng dẫn trải nghiệm" — mở lần đầu thì ghi sự kiện guide_open. */
export function GuideToggle({ mapId, children }: { mapId: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const tracked = useRef(false);
  return (
    <div className="rounded-xl border border-border bg-card">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => {
          setOpen((o) => !o);
          if (!tracked.current) {
            tracked.current = true;
            track(mapId, "guide_open");
          }
        }}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-semibold"
      >
        Cách tìm và trải nghiệm bản đồ
        <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open && <div className="border-t border-border px-4 py-3 text-sm leading-relaxed text-muted-foreground">{children}</div>}
    </div>
  );
}

type MeState = { signedIn: boolean; favorited: boolean; rating: number | null; isOwner: boolean };

export function MapEngagement({
  mapId,
  title,
  initialFavorites,
  initialRatingCount,
  initialRatingSum,
}: {
  mapId: string;
  title: string;
  initialFavorites: number;
  initialRatingCount: number;
  initialRatingSum: number;
}) {
  const [me, setMe] = useState<MeState | null>(null);
  const [favorites, setFavorites] = useState(initialFavorites);
  const [rating, setRating] = useState({ count: initialRatingCount, sum: initialRatingSum });
  const [busy, setBusy] = useState<"fav" | "rate" | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    fetch(`/api/craftland/maps/${mapId}/me`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: MeState | null) => setMe(d ?? { signedIn: false, favorited: false, rating: null, isOwner: false }))
      .catch(() => setMe({ signedIn: false, favorited: false, rating: null, isOwner: false }));
  }, [mapId]);

  const needLogin = () => {
    toast.error("Đăng nhập để thực hiện thao tác này.", {
      action: { label: "Đăng nhập", onClick: () => (window.location.href = `/auth/login?next=${encodeURIComponent(window.location.pathname)}`) },
    });
  };

  const toggleFavorite = async () => {
    if (!me?.signedIn) return needLogin();
    setBusy("fav");
    const next = !me.favorited;
    try {
      const res = await fetch(`/api/craftland/maps/${mapId}/favorite`, { method: next ? "POST" : "DELETE" });
      if (!res.ok) throw new Error(await readError(res, "Không cập nhật được."));
      setMe({ ...me, favorited: next });
      setFavorites((f) => Math.max(0, f + (next ? 1 : -1)));
      toast.success(next ? "Đã lưu vào danh sách yêu thích" : "Đã bỏ lưu");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const rate = async (score: number) => {
    if (!me?.signedIn) return needLogin();
    if (me.isOwner) return toast.error("Bạn không thể tự đánh giá bản đồ của mình.");
    setBusy("rate");
    try {
      const res = await fetch(`/api/craftland/maps/${mapId}/rating`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score }),
      });
      if (!res.ok) throw new Error(await readError(res, "Không lưu được đánh giá."));
      const data = (await res.json()) as { rating: number; rating_count: number; rating_sum: number };
      setMe({ ...me, rating: data.rating });
      setRating({ count: data.rating_count, sum: data.rating_sum });
      toast.success("Cảm ơn bạn đã đánh giá");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const share = async () => {
    const url = new URL(window.location.href);
    url.search = "";
    url.searchParams.set("src", "share");
    try {
      if (navigator.share) {
        await navigator.share({ title, url: url.toString() });
      } else {
        await navigator.clipboard.writeText(url.toString());
        toast.success("Đã sao chép liên kết chia sẻ");
      }
      track(mapId, "share");
    } catch {
      // Người dùng huỷ hộp thoại chia sẻ — không tính.
    }
  };

  const avg = rating.count > 0 ? rating.sum / rating.count : 0;
  const shown = hover ?? me?.rating ?? 0;
  const btn = "inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold transition hover:border-primary/40 disabled:opacity-60";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={toggleFavorite} disabled={busy === "fav" || !me} aria-pressed={!!me?.favorited} className={cn(btn, me?.favorited && "border-rose-500/40 text-rose-600 dark:text-rose-400")}>
          {busy === "fav" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Heart className={cn("size-4", me?.favorited && "fill-current")} aria-hidden />}
          {me?.favorited ? "Đã lưu" : "Lưu"} · <span className="tabular-nums">{favorites}</span>
        </button>
        <button type="button" onClick={share} className={btn}>
          <Share2 className="size-4" aria-hidden /> Chia sẻ
        </button>
        <button
          type="button"
          onClick={() => (me?.signedIn ? setReportOpen(true) : needLogin())}
          className={cn(btn, "text-muted-foreground")}
        >
          <Flag className="size-4" aria-hidden /> Báo cáo
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex" role="radiogroup" aria-label="Đánh giá bản đồ" onMouseLeave={() => setHover(null)}>
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={me?.rating === s}
              aria-label={`${s} sao`}
              disabled={busy === "rate" || !me || me.isOwner}
              onMouseEnter={() => setHover(s)}
              onClick={() => rate(s)}
              className="p-0.5 disabled:cursor-not-allowed"
            >
              <Star className={cn("size-6 transition", s <= shown ? "fill-amber-400 text-amber-400" : "text-muted-foreground/50")} aria-hidden />
            </button>
          ))}
        </div>
        <span className="text-sm text-muted-foreground">
          {rating.count > 0 ? (
            <><strong className="text-foreground tabular-nums">{avg.toFixed(1)}</strong>/5 · {rating.count} đánh giá</>
          ) : (
            "Chưa có đánh giá"
          )}
          {me?.rating ? ` · Bạn chấm ${me.rating} sao` : ""}
        </span>
      </div>

      <ReportDialog mapId={mapId} open={reportOpen} onOpenChange={setReportOpen} />
    </div>
  );
}

function ReportDialog({ mapId, open, onOpenChange }: { mapId: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [reason, setReason] = useState<CraftlandReportReason>("wrong_info");
  const [details, setDetails] = useState("");
  const [sending, setSending] = useState(false);

  const submit = async () => {
    setSending(true);
    try {
      const res = await fetch(`/api/craftland/maps/${mapId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, details }),
      });
      if (!res.ok) throw new Error(await readError(res, "Không gửi được báo cáo."));
      toast.success("Đã gửi báo cáo. Đội kiểm duyệt sẽ xem xét sớm.");
      setDetails("");
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Báo cáo bản đồ</DialogTitle>
          <DialogDescription>Báo cáo được gửi kín đến đội kiểm duyệt ArexNetwork.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <fieldset className="space-y-1.5">
            <legend className="mb-1 text-sm font-medium">Lý do</legend>
            {REPORT_REASONS.map((r) => (
              <label key={r.key} className="flex items-center gap-2 text-sm">
                <input type="radio" name="report-reason" value={r.key} checked={reason === r.key} onChange={() => setReason(r.key)} />
                {r.label}
              </label>
            ))}
          </fieldset>
          <label className="block text-sm font-medium">
            Mô tả thêm {reason === "other" && <span className="text-destructive">*</span>}
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              maxLength={2000}
              rows={4}
              className="mt-1 w-full rounded-lg border border-input bg-card p-2.5 text-sm font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Ví dụ: mã map dẫn tới bản đồ khác, bản đồ gốc của ai…"
            />
          </label>
        </div>
        <DialogFooter>
          <button type="button" onClick={() => onOpenChange(false)} className="h-10 rounded-lg px-4 text-sm font-medium text-muted-foreground hover:text-foreground">
            Huỷ
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={sending}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {sending && <Loader2 className="size-4 animate-spin" aria-hidden />} Gửi báo cáo
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function FollowButton({ creatorId, initialFollowers }: { creatorId: string; initialFollowers: number }) {
  const [state, setState] = useState<{ signedIn: boolean; following: boolean; isSelf: boolean } | null>(null);
  const [followers, setFollowers] = useState(initialFollowers);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`/api/craftland/creators/${creatorId}/follow`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setState(d ?? { signedIn: false, following: false, isSelf: false }))
      .catch(() => setState({ signedIn: false, following: false, isSelf: false }));
  }, [creatorId]);

  if (state?.isSelf) {
    return <span className="text-sm text-muted-foreground"><strong className="text-foreground tabular-nums">{followers}</strong> người theo dõi</span>;
  }

  return (
    <button
      type="button"
      disabled={busy || !state}
      onClick={async () => {
        if (!state?.signedIn) {
          window.location.href = `/auth/login?next=${encodeURIComponent(window.location.pathname)}`;
          return;
        }
        setBusy(true);
        const next = !state.following;
        try {
          const res = await fetch(`/api/craftland/creators/${creatorId}/follow`, { method: next ? "POST" : "DELETE" });
          if (!res.ok) throw new Error(await readError(res, "Không cập nhật được."));
          setState({ ...state, following: next });
          setFollowers((f) => Math.max(0, f + (next ? 1 : -1)));
        } catch (e) {
          toast.error((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
      className={cn(
        "inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition disabled:opacity-60",
        state?.following ? "border border-border bg-card text-foreground" : "bg-primary text-primary-foreground hover:brightness-110",
      )}
    >
      {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {state?.following ? "Đang theo dõi" : "Theo dõi"} · <span className="tabular-nums">{followers}</span>
    </button>
  );
}
