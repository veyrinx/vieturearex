"use client";

import { useEffect, useRef, useState } from "react";
import {
  Search, Loader2, User, Trophy, Heart, Shield, Calendar, Star,
  PawPrint, Globe, AlertCircle, Share2, History,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Lịch sử tra cứu (localStorage, tối đa 10 nick gần nhất) ──────────────────
const HISTORY_KEY = "ff:lookup-history";
const HISTORY_MAX = 10;

type HistoryItem = { uid: string; name: string; level: number | null; region: string; ts: number };

function loadHistory(): HistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(arr) ? (arr as HistoryItem[]).filter((h) => h && typeof h.uid === "string").slice(0, HISTORY_MAX) : [];
  } catch {
    return [];
  }
}

function saveHistory(items: HistoryItem[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, HISTORY_MAX)));
  } catch {
    /* localStorage đầy / bị chặn — bỏ qua */
  }
}

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
    ReleaseVersion?: string;
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
  socialinfo?: {
    Gender?: string;
    AccountLanguage?: string;
    ModePreference?: string;
    AccountSignature?: string;
  };
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

/** Tuổi tài khoản từ unix seconds (tạo) -> "X năm Y tháng" / "X ngày". */
function fmtAge(v: unknown): string | null {
  const n = num(v);
  if (n === null || n <= 0) return null;
  const ms = n < 1e12 ? n * 1000 : n;
  const days = Math.floor((Date.now() - ms) / 86_400_000);
  if (days < 0) return null;
  if (days < 30) return `${days} ngày tuổi`;
  const years = Math.floor(days / 365);
  const months = Math.floor((days % 365) / 30);
  if (years > 0) return `${years} năm${months > 0 ? ` ${months} tháng` : ""} tuổi`;
  return `${months} tháng tuổi`;
}

function fmtGender(v?: string): string | null {
  if (!v) return null;
  if (/female/i.test(v)) return "Nữ";
  if (/male/i.test(v)) return "Nam";
  return null;
}

function fmtMode(v?: string): string | null {
  if (!v) return null;
  if (/_CS$/i.test(v)) return "Clash Squad";
  if (/_BR$/i.test(v)) return "Battle Royale";
  return null;
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

export type FfLookupData = {
  level: number | null;
  brRankPoint: number | null;
  nickname: string | null;
};

type Props = {
  /** UID điền sẵn (vd lấy từ hồ sơ). */
  initialUid?: string;
  /** Tự tra cứu ngay khi mount nếu có initialUid. */
  autoLookup?: boolean;
  /** Nhận dữ liệu mỗi khi tra cứu thành công (để tự điền nơi khác). */
  onData?: (data: FfLookupData) => void;
  className?: string;
};

export function FfPlayerLookup({ initialUid = "", autoLookup = false, onData, className }: Props) {
  const [uid, setUid] = useState(initialUid);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<FfResult | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [resultUid, setResultUid] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [sharing, setSharing] = useState(false);
  const autoDone = useRef(false);

  useEffect(() => { setHistory(loadHistory()); }, []);

  function pushHistory(item: HistoryItem) {
    setHistory((prev) => {
      const next = [item, ...prev.filter((h) => h.uid !== item.uid)].slice(0, HISTORY_MAX);
      saveHistory(next);
      return next;
    });
  }

  function clearHistory() {
    setHistory([]);
    saveHistory([]);
  }

  async function shareCard() {
    if (!resultUid) return;
    const url = `${window.location.origin}/api/ff/player/${resultUid}/card`;
    setSharing(true);
    try {
      // Ưu tiên chia sẻ kèm ảnh (điện thoại); không hỗ trợ thì mở ảnh ở tab mới.
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (typeof nav.share === "function") {
        try {
          const blob = await (await fetch(url)).blob();
          const file = new File([blob], `nick-${resultUid}.png`, { type: "image/png" });
          if (nav.canShare?.({ files: [file] })) {
            await nav.share({ files: [file], title: "Kết quả tra cứu nick Free Fire" });
            return;
          }
        } catch { /* rơi xuống mở tab */ }
        await nav.share({ title: "Kết quả tra cứu nick Free Fire", url }).catch(() => window.open(url, "_blank"));
        return;
      }
      window.open(url, "_blank");
    } finally {
      setSharing(false);
    }
  }

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
        const info = json.result?.AccountInfo;
        if (!info) {
          setError("Không tìm thấy tài khoản với UID này.");
          setResultUid(null);
        } else {
          setResultUid(q);
          pushHistory({
            uid: q,
            name: info.AccountName ?? "Ẩn danh",
            level: num(info.AccountLevel),
            region: info.AccountRegion ?? "?",
            ts: Date.now(),
          });
          if (onData) {
            onData({
              level: num(info.AccountLevel),
              brRankPoint: num(info.BrRankPoint),
              nickname: info.AccountName ?? null,
            });
          }
        }
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
  const s = data?.socialinfo;

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

      {history.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-0.5">
            <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              <History className="size-3.5" /> Đã tra gần đây
            </span>
            <button
              type="button"
              onClick={clearHistory}
              className="text-[11px] font-semibold text-muted-foreground transition-colors hover:text-red-500"
            >
              Xóa
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {history.map((h) => (
              <button
                key={h.uid}
                type="button"
                onClick={() => { setUid(h.uid); void lookup(h.uid); }}
                disabled={loading}
                title={`UID ${h.uid}`}
                className="inline-flex max-w-[220px] items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-primary/50 disabled:opacity-50"
              >
                <span className="truncate">{h.name}</span>
                {h.level != null && (
                  <span className="shrink-0 rounded bg-primary/10 px-1 text-[10px] font-bold text-primary tabular-nums">Lv{h.level}</span>
                )}
              </button>
            ))}
          </div>
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
                {fmtAge(a.AccountCreateTime) && <> · {fmtAge(a.AccountCreateTime)}</>}
              </p>
            </div>
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-lg font-black text-white">
              {fmtNum(a.AccountLevel)}
            </div>
          </div>

          {/* Chữ ký cá nhân */}
          {s?.AccountSignature && (
            <p className="rounded-xl border border-border bg-muted/20 px-3 py-2 text-sm italic text-muted-foreground">
              “{s.AccountSignature}”
            </p>
          )}

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            <Stat icon={Star} label="Cấp độ" value={fmtNum(a.AccountLevel)} />
            <Stat icon={Heart} label="Lượt thích" value={fmtNum(a.AccountLikes)} accent="bg-rose-500/10 text-rose-500" />
            <Stat icon={Trophy} label="Rank BR" value={fmtNum(a.BrRankPoint)} accent="bg-amber-500/10 text-amber-500" />
            <Stat icon={Trophy} label="Rank CS" value={fmtNum(a.CsRankPoint)} accent="bg-sky-500/10 text-sky-500" />
            {a.AccountEXP != null && (
              <Stat icon={Star} label="EXP" value={fmtNum(a.AccountEXP)} accent="bg-indigo-500/10 text-indigo-500" />
            )}
            {data?.petInfo?.level != null && (
              <Stat icon={PawPrint} label="Pet Lv" value={fmtNum(data.petInfo.level)} accent="bg-emerald-500/10 text-emerald-500" />
            )}
            {data?.creditScoreInfo?.creditScore != null && (
              <Stat icon={Shield} label="Điểm tín nhiệm" value={fmtNum(data.creditScoreInfo.creditScore)} accent="bg-violet-500/10 text-violet-500" />
            )}
          </div>

          {/* Meta chips: giới tính · chế độ · phiên bản */}
          {(fmtGender(s?.Gender) || fmtMode(s?.ModePreference) || a.ReleaseVersion) && (
            <div className="flex flex-wrap gap-1.5">
              {fmtGender(s?.Gender) && (
                <span className="rounded-full border border-border bg-muted/30 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                  {fmtGender(s?.Gender)}
                </span>
              )}
              {fmtMode(s?.ModePreference) && (
                <span className="rounded-full border border-border bg-muted/30 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                  Thích: {fmtMode(s?.ModePreference)}
                </span>
              )}
              {a.ReleaseVersion && (
                <span className="rounded-full border border-border bg-muted/30 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                  {a.ReleaseVersion}
                </span>
              )}
            </div>
          )}

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

          <button
            type="button"
            onClick={() => void shareCard()}
            disabled={sharing}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary/10 px-4 py-2.5 text-sm font-bold text-primary transition hover:bg-primary/15 disabled:opacity-50 dark:text-amber-400"
          >
            {sharing ? <Loader2 className="size-4 animate-spin" /> : <Share2 className="size-4" />}
            Tạo ảnh chia sẻ
          </button>

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
