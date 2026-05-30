"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Trophy, Zap, Star } from "lucide-react";

type Character = {
  id: string; name: string; image_url: string | null;
  ability: string; description: string;
  votes: number; percent: number;
};

type VoteData = {
  characters: Character[];
  totalVotes: number;
  myVote: string | null;
  season: string;
};

const RANK_COLORS = ["text-amber-400","text-slate-300","text-amber-600"];
const RANK_BG    = ["border-amber-400/40 bg-amber-400/8","border-slate-300/30 bg-slate-300/5","border-amber-600/30 bg-amber-600/5"];

export function CharacterVoteSection() {
  const [data, setData] = useState<VoteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState<string | null>(null);
  const [myVote, setMyVote] = useState<string | null>(null);

  const load = async () => {
    const res = await fetch("/api/characters/vote").catch(() => null);
    if (res?.ok) {
      const d = await res.json() as VoteData;
      setData(d);
      setMyVote(d.myVote);
    }
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const vote = async (characterId: string) => {
    if (voting) return;
    setVoting(characterId);
    const res = await fetch("/api/characters/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ character_id: characterId }),
    });
    const json = await res.json() as { error?: string };
    if (!res.ok) {
      if (res.status === 401) toast.error("Vui lòng đăng nhập để bình chọn.");
      else toast.error(json.error ?? "Không thể bình chọn.");
      setVoting(null); return;
    }
    toast.success(myVote ? "Đã đổi bình chọn!" : "Bình chọn thành công!");
    setMyVote(characterId);
    await load();
    setVoting(null);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-52 animate-pulse rounded-2xl border border-border bg-muted" />
        ))}
      </div>
    );
  }

  if (!data || data.characters.length === 0) {
    return <div className="rounded-2xl border border-border bg-card p-12 text-center text-muted-foreground">Chưa có dữ liệu bình chọn.</div>;
  }

  const sorted = [...data.characters].sort((a, b) => b.votes - a.votes);

  return (
    <div className="space-y-6">
      {/* Top 3 podium */}
      <div className="grid grid-cols-3 gap-3 md:gap-4">
        {sorted.slice(0, 3).map((c, i) => (
          <div key={c.id} className={`relative overflow-hidden rounded-2xl border ${RANK_BG[i]} p-4 text-center`}>
            <div className={`absolute top-2 right-2 text-xs font-black ${RANK_COLORS[i]}`}>
              {i === 0 ? <Trophy className="size-5" /> : `#${i + 1}`}
            </div>
            <CharacterAvatar c={c} size="lg" />
            <p className="mt-2 font-heading text-sm font-black text-foreground">{c.name}</p>
            <p className="text-[10px] font-semibold text-muted-foreground">{c.ability}</p>
            <p className={`mt-1 font-heading text-xl font-black ${RANK_COLORS[i]}`}>{c.percent}%</p>
            <p className="text-[10px] text-muted-foreground">{c.votes.toLocaleString()} phiếu</p>
            <VoteButton c={c} myVote={myVote} voting={voting} onVote={vote} />
          </div>
        ))}
      </div>

      {/* Full grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {sorted.slice(3).map((c, rawIdx) => {
          const rank = rawIdx + 4;
          return (
            <div key={c.id} className="rounded-2xl border border-border bg-card p-4 space-y-2 transition-all hover:border-primary/30">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground/60">#{rank}</span>
                {myVote === c.id && <Star className="size-3.5 fill-primary text-primary dark:fill-amber-400 dark:text-amber-400" />}
              </div>
              <CharacterAvatar c={c} size="md" />
              <p className="font-heading text-xs font-black text-foreground">{c.name}</p>
              <p className="text-[10px] text-muted-foreground leading-snug">{c.ability}</p>
              {/* Vote bar */}
              <div className="space-y-1">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
                  <div className="h-full rounded-full bg-primary dark:bg-amber-400 transition-all duration-500" style={{ width: `${c.percent}%` }} />
                </div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>{c.votes.toLocaleString()} phiếu</span>
                  <span className="font-bold text-primary dark:text-amber-400">{c.percent}%</span>
                </div>
              </div>
              <VoteButton c={c} myVote={myVote} voting={voting} onVote={vote} small />
            </div>
          );
        })}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Tổng phiếu bầu: <strong className="text-foreground">{data.totalVotes.toLocaleString()}</strong> · Mùa {data.season} · Mỗi tài khoản 1 phiếu, có thể đổi bất cứ lúc nào.
      </p>
    </div>
  );
}

function CharacterAvatar({ c, size }: { c: Character; size: "lg" | "md" }) {
  const cls = size === "lg" ? "mx-auto size-16 text-2xl" : "mx-auto size-12 text-lg";
  const colors = ["from-blue-500 to-indigo-600","from-purple-500 to-pink-600","from-amber-500 to-orange-600","from-emerald-500 to-teal-600","from-red-500 to-rose-600","from-cyan-500 to-teal-600"];
  const grad = colors[c.name.charCodeAt(0) % colors.length];
  if (c.image_url) return <img src={c.image_url} alt={c.name} className={`${cls} rounded-xl object-cover`} />;
  return (
    <div className={`${cls} flex items-center justify-center rounded-xl bg-gradient-to-br ${grad} font-black text-white`}>
      <Zap className={size === "lg" ? "size-7" : "size-5"} />
    </div>
  );
}

function VoteButton({ c, myVote, voting, onVote, small }: {
  c: Character; myVote: string | null; voting: string | null;
  onVote: (id: string) => void; small?: boolean;
}) {
  const isVoted = myVote === c.id;
  const isLoading = voting === c.id;
  const cls = small ? "w-full mt-1 rounded-lg py-1 text-[11px]" : "mt-2 w-full rounded-xl py-1.5 text-xs";
  if (isVoted) {
    return (
      <div className={`${cls} flex items-center justify-center gap-1 border border-primary/30 bg-primary/10 font-bold text-primary dark:text-amber-400`}>
        <CheckCircle2 className="size-3" /> Đã bình chọn
      </div>
    );
  }
  return (
    <button onClick={() => onVote(c.id)} disabled={!!voting}
      className={`${cls} flex items-center justify-center gap-1 border border-border bg-card font-bold text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50`}>
      {isLoading ? <Loader2 className="size-3 animate-spin" /> : null}
      Bình chọn
    </button>
  );
}
