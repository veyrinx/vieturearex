"use client";

import { useEffect, useRef, useState } from "react";
import {
  Search, Loader2, User, Trophy, Heart, Shield, Calendar, Star,
  PawPrint, Globe, AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

/** Cấu trúc con (chỉ field dùng tới) từ /api/ff/player/[uid]. */
type FfResult = {
  AccountInfo?: {
    AccountName?: string;
    AccountLevel?: number | string;
    AccountLikes?: number | string;
    AccountRegion?: string;
    AccountEXP?: number | string;
    Title?: number | string;
    BrMaxRank?: number | string;
    BrRankPoint?: number | string;
    CsMaxRank?: number | string;
    CsRankPoint?: number | string;
    AccountCreateTime?: number | string;
    AccountLastLogin?: number | string;
  };
  GuildInfo?: {
    GuildName?: string;
    GuildLevel?: number | string;
    GuildMember?: number | string;
    GuildCapacity?: number | string;
  };
  petInfo?: { level?: number | string };
  creditScoreInfo?: { creditScore?: number | string };
};

type FfResponse = {
  result?: FfResult;
  usage?: { remainingToday?: number };
  error?: string;
};

function num(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function fmtNum(v: unknown): string {
  const n = num(v);
  return n === null ? "—" : n.toLocaleString("vi-VN");
}

/** AccountCreateTime/LastLogin là unix seconds (đôi khi string). */
function fmtDate(v: unknown): string | null {
  const n = num(v);
  if (n === null || n <= 0) return null;
  const ms = n < 1e12 ? n * 1000 : n; // giây → ms
  const d = new Date(ms);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString("vi-VN");
}

function Stat({ icon: Icon, label, value, accent }: {
  icon: React.ElementType; label: string; value: string; accent?: string;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-border bg-muted/30 px-3 py-2.5">
      <div className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary", accent)}>
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-bold text-foreground tabular-nums">{value}</p>
      </div>
    </div>
  );
}

type Props = {
  /** UID điền sẵn (vd lấy từ hồ sơ). */
  initialUid?: string;
  /** Tự tra cứu ngay khi mount nếu có initialUid. */
  autoLookup?: boolean;
  className?: string;
};

export function FfPlayerLookup({ initialUid = "", autoLookup = false, className }: Props) {
  const [uid, setUid] = useState(initialUid);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<FfResult | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const autoDone = useRef(false);

  async function lookup(targetUid?: string) {
    const q = (targetUid ?? uid).trim();
    if (!/^\d{4,15}$/.test(q)) {
      setError("UID không hợp lệ (chỉ gồm chữ số).");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/ff/player/${q}`);
      const json = (await res.json().catch(() => ({}))) as FfResponse;
      if (!res.ok) {
        setError(json.error || "Không tra cứu được tài khoản.");
        setData(null);
      } else {
        setData(json.result ?? null);
        setRemaining(json.usage?.remainingToday ?? null);
        if (!json.result?.AccountInfo) setError("Không tìm thấy tài khoản với UID này.");
      }
    } catch {
      setError("Lỗi mạng, thử lại sau.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  // Auto lookup 1 lần nếu được yêu cầu.
  useEffect(() => {
    if (autoLookup && initialUid && !autoDone.current) {
      autoDone.current = true;
      void lookup(initialUid);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLookup, initialUid]);

  const a = data?.AccountInfo;
  const g = data?.GuildInfo;

  return (
    <div className={cn("space-y-4", className)}>
      <form
        onSubmit={(e) => { e.preventDefault(); void lookup(); }}
        className="flex gap-2"
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={uid}
            onChange={(e) => setUid(e.target.value.replace(/\D/g, "").slice(0, 15))}
            inputMode="numeric"
            placeholder="Nhập UID Free Fire (vd: 123456789)"
            className="h-11 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
          Tra cứu
        </button>
      </form>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-500">
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </div>
      )}

      {a && (
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary dark:text-amber-400">
                Tài khoản Free Fire
              </p>
              <h3 className="truncate font-heading text-xl font-black text-foreground">
                {a.AccountName || "Ẩn danh"}
              </h3>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Globe className="size-3" /> {a.AccountRegion || "?"}
                {fmtDate(a.AccountCreateTime) && <> · Tạo {fmtDate(a.AccountCreateTime)}</>}
              </p>
            </div>
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-lg font-black text-white">
              {fmtNum(a.AccountLevel)}
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            <Stat icon={Star} label="Cấp độ" value={fmtNum(a.AccountLevel)} />
            <Stat icon={Heart} label="Lượt thích" value={fmtNum(a.AccountLikes)} accent="bg-rose-500/10 text-rose-500" />
            <Stat icon={Trophy} label="Rank BR" value={fmtNum(a.BrRankPoint)} accent="bg-amber-500/10 text-amber-500" />
            <Stat icon={Trophy} label="Rank CS" value={fmtNum(a.CsRankPoint)} accent="bg-sky-500/10 text-sky-500" />
            {data?.petInfo?.level != null && (
              <Stat icon={PawPrint} label="Pet Lv" value={fmtNum(data.petInfo.level)} accent="bg-emerald-500/10 text-emerald-500" />
            )}
            {data?.creditScoreInfo?.creditScore != null && (
              <Stat icon={Shield} label="Điểm tín nhiệm" value={fmtNum(data.creditScoreInfo.creditScore)} accent="bg-violet-500/10 text-violet-500" />
            )}
          </div>

          {/* Guild */}
          {g?.GuildName && (
            <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 px-3 py-2.5">
              <User className="size-4 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Guild</p>
                <p className="truncate text-sm font-bold text-foreground">{g.GuildName}</p>
              </div>
              <p className="shrink-0 text-xs text-muted-foreground">
                Lv {fmtNum(g.GuildLevel)} · {fmtNum(g.GuildMember)}/{fmtNum(g.GuildCapacity)}
              </p>
            </div>
          )}

          {fmtDate(a.AccountLastLogin) && (
            <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Calendar className="size-3" /> Đăng nhập gần nhất: {fmtDate(a.AccountLastLogin)}
            </p>
          )}

          {remaining != null && (
            <p className="text-right text-[10px] text-muted-foreground/70">
              Còn {remaining} lượt tra cứu hôm nay
            </p>
          )}
        </div>
      )}
    </div>
  );
}
