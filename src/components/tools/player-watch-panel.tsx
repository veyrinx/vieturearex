"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle, Bell, Loader2, Plus, Shield, Trash2, TrendingUp, UserSearch,
} from "lucide-react";

/**
 * Danh sách nick Free Fire đang theo dõi.
 *
 * Chỉ số được cron chụp mỗi ngày (xem lib/server/ff-watch.ts), nên trang này
 * KHÔNG gọi API Free Fire — chỉ đọc lại ảnh chụp gần nhất. Nick vừa ghim sẽ
 * trống cho tới lượt quét đầu tiên; nói rõ điều đó thay vì hiện ô rỗng khó hiểu.
 */

interface Snapshot {
  nickname: string | null;
  level: number | null;
  likes: number | null;
  br_rank_point: number | null;
  cs_rank_point: number | null;
  guild_name: string | null;
  captured_at?: string;
}

interface Change {
  field: string;
  old_value: string | null;
  new_value: string | null;
  changed_at?: string;
}

interface Watch {
  id: string;
  ff_id: string;
  label: string | null;
  snapshot: Snapshot | null;
  recentChanges: Change[];
}

const FIELD_LABEL: Record<string, string> = {
  nickname: "Đổi tên",
  guild: "Đổi guild",
  level: "Lên level",
  br_rank: "Rank BR",
  cs_rank: "Rank CS",
};

function fmtNum(n: number | null | undefined) {
  return n === null || n === undefined ? "—" : n.toLocaleString("vi-VN");
}

function fmtDate(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("vi-VN");
}

export function PlayerWatchPanel() {
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(true);
  const [watches, setWatches] = useState<Watch[]>([]);
  const [max, setMax] = useState(20);
  const [uid, setUid] = useState("");
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/user/ff-watch");
      const json = (await res.json().catch(() => ({}))) as {
        loggedIn?: boolean;
        watches?: Watch[];
        max?: number;
      };
      setLoggedIn(json.loggedIn !== false);
      setWatches(json.watches ?? []);
      if (json.max) setMax(json.max);
    } catch {
      setError("Không tải được danh sách.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function add() {
    const q = uid.trim();
    if (!/^\d{4,15}$/.test(q)) {
      setError("UID không hợp lệ (chỉ gồm chữ số).");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/user/ff-watch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: q, label: label.trim() || undefined }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Không thêm được.");
      } else {
        setUid("");
        setLabel("");
        await load();
      }
    } catch {
      setError("Lỗi mạng, thử lại sau.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(ffId: string) {
    setBusy(true);
    try {
      await fetch(`/api/user/ff-watch?uid=${ffId}`, { method: "DELETE" });
      await load();
    } catch {
      setError("Không bỏ được nick này.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card p-10 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Đang tải…
      </div>
    );
  }

  if (!loggedIn) {
    return (
      <div className="space-y-3 rounded-2xl border border-border bg-card p-8 text-center">
        <UserSearch className="mx-auto size-10 text-muted-foreground" />
        <p className="text-sm font-bold text-foreground">Cần đăng nhập để theo dõi nick</p>
        <p className="text-xs text-muted-foreground">
          Ghim tối đa {max} nick, hệ thống báo mỗi khi có đổi tên, đổi guild hoặc thay đổi rank.
        </p>
        <Link
          href="/login"
          className="inline-flex h-10 items-center rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground"
        >
          Đăng nhập
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void add();
        }}
        className="flex flex-col gap-2 sm:flex-row"
      >
        <input
          value={uid}
          onChange={(e) => setUid(e.target.value.replace(/\D/g, "").slice(0, 15))}
          inputMode="numeric"
          placeholder="UID người chơi (vd: 123456789)"
          className="h-11 flex-1 rounded-xl border border-border bg-background px-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value.slice(0, 60))}
          placeholder="Ghi chú (acc chính, đối thủ…)"
          className="h-11 flex-1 rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <button
          type="submit"
          disabled={busy || watches.length >= max}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Theo dõi
        </button>
      </form>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-500">
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </div>
      )}

      <p className="text-[11px] text-muted-foreground">
        Đang theo dõi {watches.length}/{max} nick. Hệ thống chụp lại chỉ số mỗi ngày một lần và gửi
        thông báo khi có thay đổi.
      </p>

      {watches.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Chưa theo dõi nick nào. Dán UID vào ô trên để bắt đầu.
        </div>
      ) : (
        <div className="space-y-3">
          {watches.map((w) => (
            <div key={w.id} className="space-y-3 rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate font-heading text-base font-black text-foreground">
                      {w.snapshot?.nickname ?? `UID ${w.ff_id}`}
                    </h3>
                    {w.label && (
                      <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                        {w.label}
                      </span>
                    )}
                  </div>
                  <p className="font-mono text-[11px] text-muted-foreground">UID {w.ff_id}</p>
                </div>
                <button
                  onClick={() => void remove(w.ff_id)}
                  disabled={busy}
                  aria-label="Bỏ theo dõi"
                  className="shrink-0 rounded-lg border border-border p-2 text-muted-foreground transition hover:border-red-500/40 hover:text-red-500 disabled:opacity-50"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>

              {w.snapshot ? (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Stat label="Level" value={fmtNum(w.snapshot.level)} />
                  <Stat label="Rank BR" value={fmtNum(w.snapshot.br_rank_point)} />
                  <Stat label="Rank CS" value={fmtNum(w.snapshot.cs_rank_point)} />
                  <Stat label="Guild" value={w.snapshot.guild_name ?? "Không có"} />
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-border px-3 py-2 text-[11px] text-muted-foreground">
                  Chưa có dữ liệu — lượt quét đầu tiên sẽ chạy trong hôm nay.
                </p>
              )}

              {w.recentChanges.length > 0 && (
                <div className="space-y-1.5 border-t border-border pt-3">
                  <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-primary">
                    <TrendingUp className="size-3" /> Biến động gần đây
                  </p>
                  {w.recentChanges.map((c, i) => (
                    <p key={i} className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="font-bold text-foreground">{FIELD_LABEL[c.field] ?? c.field}</span>
                      <span className="font-mono">
                        {c.old_value ?? "—"} → {c.new_value ?? "—"}
                      </span>
                      <span className="opacity-60">{fmtDate(c.changed_at)}</span>
                    </p>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                <Link
                  href={`/player-lookup?uid=${w.ff_id}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-foreground transition hover:border-primary/40"
                >
                  <Shield className="size-3.5" /> Xem hồ sơ đầy đủ
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
        <Bell className="mt-0.5 size-3.5 shrink-0" />
        Lịch sử đổi tên và đổi guild là thứ đáng xem nhất trước khi mua acc: một nick đổi tên nhiều
        lần trong thời gian ngắn thường đã qua tay nhiều chủ.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="truncate text-sm font-black text-foreground">{value}</p>
    </div>
  );
}
