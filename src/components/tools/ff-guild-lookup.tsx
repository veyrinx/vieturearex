"use client";

import { useState } from "react";
import { Search, Loader2, Users, Shield, Crown, Layers, AlertCircle, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

/** Chỉ field dùng tới từ /api/ff/player/[uid]. */
type FfResult = {
  AccountInfo?: {
    AccountName?: string;
    AccountLevel?: number | string;
    AccountRegion?: string;
  };
  GuildInfo?: {
    GuildName?: string;
    GuildLevel?: number | string;
    GuildMember?: number | string;
    GuildCapacity?: number | string;
    GuildOwner?: string;
    GuildID?: string | number;
  };
};

type FfResponse = { result?: FfResult; usage?: { remainingToday?: number }; error?: string };

function num(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function fmt(v: unknown): string {
  const n = num(v);
  return n === null ? "—" : n.toLocaleString("vi-VN");
}

function GuildStat({ icon: Icon, label, value, accent }: {
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

export function FfGuildLookup() {
  const [uid, setUid] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FfResult | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);

  async function lookup() {
    const q = uid.trim();
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
        setResult(null);
      } else {
        setResult(json.result ?? null);
        setRemaining(json.usage?.remainingToday ?? null);
        if (!json.result?.GuildInfo?.GuildName) {
          setError("Tài khoản này chưa tham gia guild nào.");
        }
      }
    } catch {
      setError("Lỗi mạng, thử lại sau.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  const a = result?.AccountInfo;
  const g = result?.GuildInfo;
  const member = num(g?.GuildMember);
  const capacity = num(g?.GuildCapacity);
  const fillPct = member != null && capacity ? Math.min(100, Math.round((member / capacity) * 100)) : null;

  return (
    <div className="space-y-4">
      <form onSubmit={(e) => { e.preventDefault(); void lookup(); }} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={uid}
            onChange={(e) => setUid(e.target.value.replace(/\D/g, "").slice(0, 15))}
            inputMode="numeric"
            placeholder="Nhập UID thành viên guild (vd: 123456789)"
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

      {g?.GuildName && (
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary dark:text-amber-400">Guild Free Fire</p>
              <h3 className="truncate font-heading text-xl font-black text-foreground">{g.GuildName}</h3>
              {g.GuildID != null && (
                <p className="mt-0.5 font-mono text-xs text-muted-foreground">ID {String(g.GuildID)}</p>
              )}
            </div>
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-500 text-lg font-black text-white">
              {fmt(g.GuildLevel)}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            <GuildStat icon={Shield} label="Cấp guild" value={fmt(g.GuildLevel)} accent="bg-teal-500/10 text-teal-500" />
            <GuildStat icon={Users} label="Thành viên" value={`${fmt(g.GuildMember)}/${fmt(g.GuildCapacity)}`} accent="bg-sky-500/10 text-sky-500" />
            {fillPct != null && (
              <GuildStat icon={Layers} label="Lấp đầy" value={`${fillPct}%`} accent="bg-emerald-500/10 text-emerald-500" />
            )}
          </div>

          {/* Sức chứa */}
          {fillPct != null && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                <span>Sĩ số</span>
                <span>{fmt(g.GuildMember)}/{fmt(g.GuildCapacity)}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-gradient-to-r from-teal-500 to-cyan-500" style={{ width: `${fillPct}%` }} />
              </div>
            </div>
          )}

          {/* Chủ guild = tài khoản đã tra (nếu là owner) */}
          <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 px-3 py-2.5">
            <Crown className="size-4 shrink-0 text-amber-500" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tra từ tài khoản</p>
              <p className="truncate text-sm font-bold text-foreground">{a?.AccountName || "Ẩn danh"}</p>
            </div>
            <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
              <UserRound className="size-3.5" /> Lv {fmt(a?.AccountLevel)} · {a?.AccountRegion || "?"}
            </span>
          </div>

          {remaining != null && (
            <p className="text-right text-[10px] text-muted-foreground/70">Còn {remaining} lượt tra cứu hôm nay</p>
          )}
        </div>
      )}
    </div>
  );
}
