"use client";

import { useState } from "react";
import { Search, Loader2, Swords, Crown, Minus, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type AccountInfo = {
  AccountName?: string;
  AccountLevel?: number | string;
  AccountLikes?: number | string;
  AccountEXP?: number | string;
  BrRankPoint?: number | string;
  CsRankPoint?: number | string;
  AccountRegion?: string;
};
type Result = {
  AccountInfo?: AccountInfo;
  petInfo?: { level?: number | string };
  creditScoreInfo?: { creditScore?: number | string };
};
type Resp = { result?: Result; usage?: { remainingToday?: number }; error?: string };

function num(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function fmt(v: unknown): string {
  const n = num(v);
  return n === null ? "—" : n.toLocaleString("vi-VN");
}

type Side = { loading: boolean; error: string | null; data: Result | null };
const EMPTY: Side = { loading: false, error: null, data: null };

const ROWS: { label: string; get: (r: Result) => number | null }[] = [
  { label: "Cấp độ", get: (r) => num(r.AccountInfo?.AccountLevel) },
  { label: "Lượt thích", get: (r) => num(r.AccountInfo?.AccountLikes) },
  { label: "Rank BR", get: (r) => num(r.AccountInfo?.BrRankPoint) },
  { label: "Rank CS", get: (r) => num(r.AccountInfo?.CsRankPoint) },
  { label: "EXP", get: (r) => num(r.AccountInfo?.AccountEXP) },
  { label: "Pet Lv", get: (r) => num(r.petInfo?.level) },
  { label: "Tín nhiệm", get: (r) => num(r.creditScoreInfo?.creditScore) },
];

export function FfCompare() {
  const [uidA, setUidA] = useState("");
  const [uidB, setUidB] = useState("");
  const [a, setA] = useState<Side>(EMPTY);
  const [b, setB] = useState<Side>(EMPTY);
  const [remaining, setRemaining] = useState<number | null>(null);

  async function fetchOne(uid: string, set: (s: Side) => void) {
    const q = uid.trim();
    if (!/^\d{4,15}$/.test(q)) {
      set({ loading: false, error: "UID không hợp lệ.", data: null });
      return;
    }
    set({ loading: true, error: null, data: null });
    try {
      const res = await fetch(`/api/ff/player/${q}`);
      const json = (await res.json().catch(() => ({}))) as Resp;
      if (!res.ok || !json.result?.AccountInfo) {
        set({ loading: false, error: json.error || "Không tìm thấy tài khoản.", data: null });
      } else {
        set({ loading: false, error: null, data: json.result });
        if (json.usage?.remainingToday != null) setRemaining(json.usage.remainingToday);
      }
    } catch {
      set({ loading: false, error: "Lỗi mạng.", data: null });
    }
  }

  function compare(e: React.FormEvent) {
    e.preventDefault();
    void fetchOne(uidA, setA);
    void fetchOne(uidB, setB);
  }

  const busy = a.loading || b.loading;
  const bothReady = a.data && b.data;

  // Đếm số hàng mỗi bên thắng để tính "tổng kết".
  let winA = 0;
  let winB = 0;
  if (bothReady) {
    for (const row of ROWS) {
      const va = row.get(a.data!);
      const vb = row.get(b.data!);
      if (va != null && vb != null) {
        if (va > vb) winA++;
        else if (vb > va) winB++;
      }
    }
  }

  return (
    <div className="space-y-5">
      <form onSubmit={compare} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { val: uidA, set: setUidA, label: "Nick A" },
            { val: uidB, set: setUidB, label: "Nick B" },
          ].map((f) => (
            <div key={f.label} className="relative">
              <span className="absolute left-3 top-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                {f.label}
              </span>
              <Search className="pointer-events-none absolute left-3 bottom-3 size-4 text-muted-foreground" />
              <input
                value={f.val}
                onChange={(e) => f.set(e.target.value.replace(/\D/g, "").slice(0, 15))}
                inputMode="numeric"
                placeholder="Nhập UID…"
                className="h-16 w-full rounded-xl border border-border bg-background pl-9 pr-3 pt-4 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          ))}
        </div>
        <button
          type="submit"
          disabled={busy}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Swords className="size-4" />}
          So sánh
        </button>
      </form>

      {/* Header 2 nick */}
      {(a.data || b.data || a.error || b.error) && (
        <div className="grid grid-cols-2 gap-3">
          {[a, b].map((side, i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-4 text-center">
              {side.error ? (
                <div className="flex flex-col items-center gap-1.5 py-2 text-red-500">
                  <AlertCircle className="size-5" />
                  <p className="text-xs">{side.error}</p>
                </div>
              ) : side.data?.AccountInfo ? (
                <>
                  <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-base font-black text-white">
                    {fmt(side.data.AccountInfo.AccountLevel)}
                  </div>
                  <p className="mt-2 truncate font-heading text-sm font-black text-foreground">
                    {side.data.AccountInfo.AccountName || "Ẩn danh"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{side.data.AccountInfo.AccountRegion || "?"}</p>
                </>
              ) : (
                <p className="py-4 text-xs text-muted-foreground">—</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Bảng so sánh */}
      {bothReady && (
        <div className="overflow-hidden rounded-2xl border border-border">
          {ROWS.map((row, idx) => {
            const va = row.get(a.data!);
            const vb = row.get(b.data!);
            const aWin = va != null && vb != null && va > vb;
            const bWin = va != null && vb != null && vb > va;
            return (
              <div
                key={row.label}
                className={cn(
                  "grid grid-cols-[1fr,auto,1fr] items-center gap-2 px-3 py-2.5 text-sm",
                  idx % 2 === 0 ? "bg-card" : "bg-muted/20",
                )}
              >
                <span className={cn("text-right font-bold tabular-nums", aWin ? "text-primary dark:text-amber-400" : "text-foreground")}>
                  {fmt(va)}
                  {aWin && <Crown className="ml-1 inline size-3.5 text-amber-500" />}
                </span>
                <span className="min-w-[92px] text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {row.label}
                </span>
                <span className={cn("text-left font-bold tabular-nums", bWin ? "text-primary dark:text-amber-400" : "text-foreground")}>
                  {bWin && <Crown className="mr-1 inline size-3.5 text-amber-500" />}
                  {fmt(vb)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Tổng kết */}
      {bothReady && (
        <div className="flex items-center justify-center gap-3 rounded-2xl border border-primary/20 bg-primary/[0.04] p-4 text-center">
          {winA === winB ? (
            <p className="flex items-center gap-2 font-heading text-sm font-black uppercase text-muted-foreground">
              <Minus className="size-4" /> Hai nick ngang tài ({winA}–{winB})
            </p>
          ) : (
            <p className="flex items-center gap-2 font-heading text-base font-black uppercase text-primary dark:text-amber-400">
              <Crown className="size-5 text-amber-500" />
              {winA > winB ? a.data!.AccountInfo?.AccountName : b.data!.AccountInfo?.AccountName} thắng {Math.max(winA, winB)}–{Math.min(winA, winB)}
            </p>
          )}
        </div>
      )}

      {remaining != null && (
        <p className="text-right text-[10px] text-muted-foreground/70">Còn {remaining} lượt tra cứu hôm nay</p>
      )}
    </div>
  );
}
