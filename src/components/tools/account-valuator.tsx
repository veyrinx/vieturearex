"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Gem, Crown, Shirt, Sparkles, Star, Users, PawPrint, Trophy, Upload, LogIn, Download, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const RANKS = [
  { key: "bronze", label: "Đồng", pts: 2 },
  { key: "silver", label: "Bạc", pts: 4 },
  { key: "gold", label: "Vàng", pts: 7 },
  { key: "plat", label: "Bạch Kim", pts: 11 },
  { key: "diamond", label: "Kim Cương", pts: 18 },
  { key: "heroic", label: "Cao Thủ", pts: 28 },
  { key: "gm", label: "Đại Cao Thủ", pts: 45 },
];

type NumField = { key: string; label: string; icon: typeof Gem; weight: number; hint?: string };

const FIELDS: NumField[] = [
  { key: "level", label: "Level tài khoản", icon: Star, weight: 0.15, hint: "vd: 65" },
  { key: "gunSkins", label: "Số skin súng", icon: Sparkles, weight: 1.5 },
  { key: "bundles", label: "Trang phục / bộ hiếm", icon: Shirt, weight: 4 },
  { key: "limited", label: "Vật phẩm giới hạn", icon: Crown, weight: 9, hint: "skin/bộ ngừng phát hành" },
  { key: "characters", label: "Số nhân vật sở hữu", icon: Users, weight: 1 },
  { key: "pets", label: "Số pet sở hữu", icon: PawPrint, weight: 1 },
  { key: "diamonds", label: "Kim cương hiện có", icon: Gem, weight: 0.002, hint: "vd: 5000" },
];

function num(v: string) {
  const n = parseInt(v.replace(/[^0-9]/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
}

const TIERS = [
  { min: 0, label: "Nick thường", cls: "text-zinc-400", bar: "bg-zinc-400" },
  { min: 40, label: "Nick khá", cls: "text-emerald-500", bar: "bg-emerald-500" },
  { min: 90, label: "Nick ngon", cls: "text-blue-500", bar: "bg-blue-500" },
  { min: 170, label: "Nick VIP", cls: "text-violet-500", bar: "bg-violet-500" },
  { min: 300, label: "Nick khủng", cls: "text-amber-500", bar: "bg-amber-500" },
  { min: 500, label: "Nick huyền thoại", cls: "text-rose-500", bar: "bg-rose-500" },
];

type Prefill = { level?: number | null; rankKey?: string | null; nonce?: number };

export function AccountValuator({ prefill }: { prefill?: Prefill } = {}) {
  const [rank, setRank] = useState("diamond");
  const [v, setV] = useState<Record<string, string>>({});
  const set = (k: string, val: string) => setV((p) => ({ ...p, [k]: val }));

  // Tự điền level & rank khi có dữ liệu từ tra cứu UID (nonce đổi mỗi lần tra cứu).
  useEffect(() => {
    if (!prefill) return;
    if (typeof prefill.level === "number" && prefill.level > 0) {
      setV((p) => ({ ...p, level: String(prefill.level) }));
    }
    if (prefill.rankKey && RANKS.some((r) => r.key === prefill.rankKey)) {
      setRank(prefill.rankKey);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill?.nonce]);
  const [posting, setPosting] = useState(false);
  const [posted, setPosted] = useState(false);
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [fetching, setFetching] = useState(false);

  async function fetchFromFfId() {
    setFetching(true);
    try {
      const res = await fetch("/api/ff-info");
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (json.needFfId) {
          toast.error(json.error, { action: { label: "Mở hồ sơ", onClick: () => { window.location.href = "/profile"; } } });
        } else {
          toast.error(json.error ?? "Không lấy được dữ liệu.");
        }
        return;
      }
      if (json.level) set("level", String(json.level));
      if (json.rankKey && RANKS.some((r) => r.key === json.rankKey)) setRank(json.rankKey);
      toast.success(
        `Đã lấy dữ liệu${json.nickname ? ` của ${json.nickname}` : ""}. Skin/đồ hiếm hãy nhập tay giúp mình.`,
      );
    } finally {
      setFetching(false);
    }
  }

  useEffect(() => {
    const sb = createClient();
    if (!sb) { setLoggedIn(false); return; }
    sb.auth.getUser().then(({ data }) => setLoggedIn(!!data.user)).catch(() => setLoggedIn(false));
  }, []);

  const { score, tier, breakdown, hasInput } = useMemo(() => {
    const rankPts = RANKS.find((r) => r.key === rank)?.pts ?? 0;
    const parts = FIELDS.map((f) => ({ label: f.label, pts: num(v[f.key] ?? "") * f.weight }));
    const total = rankPts + parts.reduce((s, p) => s + p.pts, 0);
    const t = [...TIERS].reverse().find((x) => total >= x.min) ?? TIERS[0];
    const hi = parts.filter((p) => p.pts > 0).sort((a, b) => b.pts - a.pts).slice(0, 3);
    return {
      score: Math.round(total),
      tier: t,
      breakdown: [{ label: `Rank ${RANKS.find((r) => r.key === rank)?.label}`, pts: rankPts }, ...hi],
      hasInput: total > rankPts || Object.values(v).some((x) => num(x) > 0),
    };
  }, [rank, v]);

  const pct = Math.min(100, (score / 600) * 100);

  async function postToLeaderboard() {
    setPosting(true);
    try {
      const res = await fetch("/api/account-scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score, tier: tier.label }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (json.needFfId) {
          toast.error(json.error, { action: { label: "Mở hồ sơ", onClick: () => { window.location.href = "/profile"; } } });
        } else {
          toast.error(json.error ?? "Đăng thất bại.");
        }
        return;
      }
      setPosted(true);
      toast.success("Đã đăng lên BXH!");
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="space-y-6">
      {loggedIn && (
        <div className="flex flex-col gap-2 rounded-2xl border border-primary/30 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground">Tự động lấy từ ID Free Fire</p>
            <p className="text-[11px] text-muted-foreground">Điền sẵn level &amp; rank từ ID trong hồ sơ. Skin/đồ hiếm vẫn nhập tay (game không cho lấy).</p>
          </div>
          <button
            onClick={fetchFromFfId}
            disabled={fetching}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {fetching ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            {fetching ? "Đang lấy..." : "Lấy dữ liệu"}
          </button>
        </div>
      )}

      <div className="space-y-1">
        <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Rank cao nhất</label>
        <div className="flex flex-wrap gap-1.5">
          {RANKS.map((r) => (
            <button
              key={r.key}
              onClick={() => setRank(r.key)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-bold transition-colors",
                rank === r.key ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {FIELDS.map((f) => (
          <div key={f.key} className="space-y-1">
            <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              <f.icon className="size-3.5" /> {f.label}
            </label>
            <input
              inputMode="numeric"
              value={v[f.key] ?? ""}
              onChange={(e) => set(f.key, e.target.value)}
              placeholder={f.hint ?? "0"}
              className="h-11 w-full rounded-xl border border-border bg-background px-3 text-base tabular-nums outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
        ))}
      </div>

      {hasInput && (
        <div className="rounded-2xl border border-border bg-gradient-to-br from-card to-muted/20 p-6 text-center">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Độ khủng của nick</p>
          <p className={cn("mt-1 font-heading text-4xl font-black tabular-nums", tier.cls)}>{score.toLocaleString()} <span className="text-lg">điểm</span></p>
          <p className={cn("mt-1 font-heading text-lg font-black uppercase", tier.cls)}>{tier.label}</p>
          <div className="mx-auto mt-3 h-2 max-w-xs overflow-hidden rounded-full bg-muted">
            <div className={cn("h-full rounded-full transition-all", tier.bar)} style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {breakdown.map((b, i) => (
              <span key={i} className="inline-flex items-center gap-1 rounded-lg bg-muted/60 px-2 py-1 text-[11px] text-muted-foreground">
                <Trophy className="size-3" /> {b.label}: <b className="text-foreground">+{Math.round(b.pts)}</b>
              </span>
            ))}
          </div>

          {/* Đăng lên BXH — dùng chính tài khoản (ID FF từ hồ sơ) */}
          <div className="mt-5 border-t border-border pt-4">
            {posted ? (
              <p className="text-sm font-semibold text-emerald-500">
                Đã đăng! Xem <Link href="/bxh-nick" className="underline">bảng xếp hạng nick</Link>.
              </p>
            ) : loggedIn ? (
              <button
                onClick={postToLeaderboard}
                disabled={posting}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                <Upload className="size-4" /> {posting ? "Đang đăng..." : "Đăng lên BXH (tài khoản của bạn)"}
              </button>
            ) : (
              <Link
                href="/login?next=/dinh-gia-nick"
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-5 text-sm font-bold text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
              >
                <LogIn className="size-4" /> Đăng nhập để đăng lên BXH
              </Link>
            )}
            <p className="mt-2 text-[11px] text-muted-foreground/70">Đăng bằng ID Free Fire trong hồ sơ — không cần nhập tay.</p>
          </div>
        </div>
      )}

      <p className="text-center text-[11px] text-muted-foreground/70">
        Chỉ là điểm vui tham khảo — <b>không phải giá bán</b>. Mua/bán tài khoản vi phạm điều khoản Garena và rất dễ bị lừa/khoá nick.
      </p>
    </div>
  );
}
