import React from "react";
import { Page, Header, Box, Text } from "zmp-ui";
import { fetchLeaderboard } from "../api";
import { useAsync } from "../hooks/useAsync";
import { Loading, ErrorState, Empty } from "../components/states";
import type { PlayerRank } from "../types";

const MEDALS = ["🥇", "🥈", "🥉"];

function initial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "?";
}

function PodiumCard({ p, rank }: { p: PlayerRank; rank: 1 | 2 | 3 }) {
  const place = rank === 1 ? "one" : rank === 2 ? "two" : "three";
  return (
    <Box className={`podium-card podium-${place}`} flex flexDirection="column" alignItems="center">
      <Box className="podium-medal">{MEDALS[rank - 1]}</Box>
      <Box className="podium-avatar">{initial(p.display_name)}</Box>
      <Text className="podium-name">
        {p.display_name}
        {p.team_tag ? <span className="muted"> [{p.team_tag}]</span> : null}
      </Text>
      <Text size="xxSmall" className="podium-points">
        ⭐ {p.total_points.toLocaleString("vi-VN")}
      </Text>
    </Box>
  );
}

export default function LeaderboardPage() {
  const { data, loading, error, reload } = useAsync(fetchLeaderboard);
  const top3 = data?.slice(0, 3) ?? [];
  const rest = data?.slice(3) ?? [];

  return (
    <Page className="page">
      <Header title="Bảng xếp hạng" />
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState onRetry={reload} />
      ) : !data || data.length === 0 ? (
        <Empty label="Chưa có dữ liệu xếp hạng" />
      ) : (
        <>
          {/* Podium top 3 — #2 trái, #1 giữa (cao hơn), #3 phải */}
          {top3.length > 0 && (
            <Box className="podium" flex alignItems="flex-end" justifyContent="center">
              {top3[1] && <PodiumCard p={top3[1]} rank={2} />}
              {top3[0] && <PodiumCard p={top3[0]} rank={1} />}
              {top3[2] && <PodiumCard p={top3[2]} rank={3} />}
            </Box>
          )}

          {rest.length > 0 && (
            <Box className="list">
              {rest.map((p, i) => (
                <Box key={p.user_id} className="row rank-row" flex alignItems="center">
                  <Box className="rank">#{i + 4}</Box>
                  <Box flex flexDirection="column" style={{ flex: 1, minWidth: 0 }}>
                    <Text className="row-title">
                      {p.display_name}
                      {p.team_tag ? <span className="muted"> [{p.team_tag}]</span> : null}
                    </Text>
                    <Text size="xSmall" className="muted" style={{ marginTop: 4 }}>
                      ⭐ {p.total_points.toLocaleString("vi-VN")} · 🔫 {p.total_kills} · K/D {p.kd_ratio}
                    </Text>
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </>
      )}
    </Page>
  );
}
