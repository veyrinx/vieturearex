"use client";

import { useState } from "react";
import { Mi } from "../_components/mi";
import { selectionHaptic, shareToTelegram, haptic } from "../_lib/tg";

export type PlayerRow = {
  user_id: string;
  display_name: string | null;
  ff_id: string | null;
  total_points: number;
  total_kills: number;
  matches_played: number;
};

export type NickRow = {
  ff_id: string | null;
  display_name: string | null;
  avatar_url: string | null;
  score: number;
  tier: string | null;
};

export type QuizRow = {
  display_name: string | null;
  avatar_url: string | null;
  best_score: number;
  best_total: number;
  plays: number;
};

const medals = ["🥇", "🥈", "🥉"];

function Rank({ i }: { i: number }) {
  return (
    <span
      className={i < 3 ? "w-6 text-center text-lg" : "w-6 text-center font-mono text-xs font-bold"}
      style={{ color: "var(--tg-theme-hint-color,#8b8b8b)" }}
    >
      {i < 3 ? medals[i] : i + 1}
    </span>
  );
}

export function LeaderboardTabs({ players, nicks, quizzes }: { players: PlayerRow[]; nicks: NickRow[]; quizzes: QuizRow[] }) {
  const [tab, setTab] = useState<"players" | "nicks" | "quiz">("players");

  const TABS = [
    { key: "players" as const, label: "Tuyển thủ", icon: "military_tech" },
    { key: "nicks" as const, label: "Nick khủng", icon: "diamond" },
    { key: "quiz" as const, label: "Quiz", icon: "psychology" },
  ];

  function share() {
    haptic("light");
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const text =
      tab === "players"
        ? "🏆 BXH tuyển thủ Free Fire cộng đồng Arex — xem ai đứng top!"
        : tab === "nicks"
        ? "💎 BXH nick khủng Free Fire trên Arex — nick của bạn hạng mấy?"
        : "🧠 BXH Quiz Free Fire trên Arex — thử tài xem bạn top mấy?";
    shareToTelegram(text, `${origin}/tg/leaderboard`);
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Tab switch */}
      <div
        className="flex gap-1 rounded-xl p-1"
        style={{ backgroundColor: "var(--tg-theme-secondary-bg-color,#1c1c1f)" }}
      >
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); selectionHaptic(); }}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all"
              style={{
                backgroundColor: active ? "var(--tg-theme-button-color,#f97316)" : "transparent",
                color: active ? "var(--tg-theme-button-text-color,#fff)" : "var(--tg-theme-hint-color,#8b8b8b)",
              }}
            >
              <Mi name={t.icon} size={16} fill={active ? 1 : 0} />
              {t.label}
            </button>
          );
        })}
      </div>

      <button
        onClick={share}
        className="flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition-transform active:scale-[0.98]"
        style={{ backgroundColor: "var(--tg-theme-secondary-bg-color,#1c1c1f)", color: "var(--tg-theme-button-color,#f97316)" }}
      >
        <Mi name="share" size={15} /> Chia sẻ bảng xếp hạng
      </button>

      {tab === "players" && (
        players.length === 0 ? (
          <Empty text="Chưa có dữ liệu xếp hạng giải đấu." />
        ) : (
          <div className="space-y-2">
            {players.map((p, i) => (
              <Row key={p.user_id} i={i}>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{p.display_name ?? "—"}</p>
                  {p.ff_id && (
                    <p className="font-mono text-[11px]" style={{ color: "var(--tg-theme-hint-color,#8b8b8b)" }}>FF: {p.ff_id}</p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold" style={{ color: "var(--tg-theme-button-color,#f97316)" }}>
                    {p.total_points.toLocaleString("vi-VN")} điểm
                  </p>
                  <p className="text-[10px]" style={{ color: "var(--tg-theme-hint-color,#8b8b8b)" }}>
                    {p.total_kills} kills · {p.matches_played} trận
                  </p>
                </div>
              </Row>
            ))}
          </div>
        )
      )}

      {tab === "nicks" && (
        nicks.length === 0 ? (
          <Empty text="Chưa có ai đăng BXH nick. Tính & đăng trên web nhé!" />
        ) : (
          <div className="space-y-2">
            {nicks.map((n, i) => {
              const name = n.display_name || (n.ff_id ? `FF ${n.ff_id}` : "Người chơi");
              return (
                <Row key={i} i={i}>
                  <div className="size-8 shrink-0 overflow-hidden rounded-full" style={{ backgroundColor: "var(--tg-theme-bg-color,#111)" }}>
                    {n.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={n.avatar_url} alt={name} className="size-full object-cover" />
                    ) : (
                      <div className="flex size-full items-center justify-center text-xs font-black" style={{ color: "var(--tg-theme-hint-color,#8b8b8b)" }}>
                        {name.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{name}</p>
                    {n.tier && (
                      <p className="text-[11px]" style={{ color: "var(--tg-theme-hint-color,#8b8b8b)" }}>{n.tier}</p>
                    )}
                  </div>
                  <p className="shrink-0 text-sm font-bold" style={{ color: "var(--tg-theme-button-color,#f97316)" }}>
                    {n.score.toLocaleString("vi-VN")} điểm
                  </p>
                </Row>
              );
            })}
          </div>
        )
      )}

      {tab === "quiz" && (
        quizzes.length === 0 ? (
          <Empty text="Chưa có ai chơi Quiz. Liên kết tài khoản & chơi để lên bảng!" />
        ) : (
          <div className="space-y-2">
            {quizzes.map((qz, i) => {
              const name = qz.display_name || "Người chơi";
              return (
                <Row key={i} i={i}>
                  <div className="size-8 shrink-0 overflow-hidden rounded-full" style={{ backgroundColor: "var(--tg-theme-bg-color,#111)" }}>
                    {qz.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={qz.avatar_url} alt={name} className="size-full object-cover" />
                    ) : (
                      <div className="flex size-full items-center justify-center text-xs font-black" style={{ color: "var(--tg-theme-hint-color,#8b8b8b)" }}>
                        {name.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{name}</p>
                    <p className="text-[11px]" style={{ color: "var(--tg-theme-hint-color,#8b8b8b)" }}>{qz.plays} lượt chơi</p>
                  </div>
                  <p className="shrink-0 text-sm font-bold" style={{ color: "var(--tg-theme-button-color,#f97316)" }}>
                    {qz.best_score}/{qz.best_total}
                  </p>
                </Row>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}

function Row({ i, children }: { i: number; children: React.ReactNode }) {
  return (
    <div
      className="flex items-center gap-3 rounded-2xl px-4 py-3"
      style={{
        backgroundColor: "var(--tg-theme-secondary-bg-color,#1c1c1f)",
        border: i === 0 ? "1px solid rgba(251,191,36,0.3)" : "none",
      }}
    >
      <Rank i={i} />
      {children}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <p className="py-10 text-center text-sm" style={{ color: "var(--tg-theme-hint-color,#8b8b8b)" }}>
      {text}
    </p>
  );
}
