import React from "react";
import { Page, Header, Box, Text } from "zmp-ui";
import { fetchLeaderboard } from "../api";
import { useAsync } from "../hooks/useAsync";
import { Loading, ErrorState, Empty } from "../components/states";

function medal(rank: number) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `#${rank}`;
}

export default function LeaderboardPage() {
  const { data, loading, error, reload } = useAsync(fetchLeaderboard);

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
        <Box className="list">
          {data.map((p, i) => (
            <Box key={p.user_id} className={`row rank-row${i < 3 ? " top" : ""}`} flex alignItems="center">
              <Box className="rank">{medal(i + 1)}</Box>
              <Box flex flexDirection="column" style={{ flex: 1, minWidth: 0 }}>
                <Text className="row-title">
                  {p.display_name}
                  {p.team_tag ? <span className="muted"> [{p.team_tag}]</span> : null}
                </Text>
                <Text size="xSmall" className="muted" style={{ marginTop: 4 }}>
                  ⭐ {p.total_points.toLocaleString("vi-VN")} điểm · 🔫 {p.total_kills} · K/D {p.kd_ratio}
                </Text>
              </Box>
            </Box>
          ))}
        </Box>
      )}
    </Page>
  );
}
