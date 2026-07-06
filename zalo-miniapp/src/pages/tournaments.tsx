import React from "react";
import { Page, Header, Box, Text, Icon } from "zmp-ui";
import { openWebview } from "zmp-sdk/apis";
import { fetchTournaments } from "../api";
import { useAsync } from "../hooks/useAsync";
import { Loading, ErrorState, Empty } from "../components/states";
import { SITE_URL } from "../config";

const MODE_LABEL: Record<string, string> = {
  "1v1": "1v1",
  "2v2": "2v2",
  "4v4": "4v4",
  squad: "Squad",
};

export default function TournamentsPage() {
  const { data, loading, error, reload } = useAsync(fetchTournaments);

  const open = () => {
    const url = `${SITE_URL}/tournaments`;
    openWebview({ url }).catch(() => window.open(url, "_blank"));
  };

  return (
    <Page className="page">
      <Header title="Giải đấu" />
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState onRetry={reload} />
      ) : !data || data.length === 0 ? (
        <Empty label="Chưa có giải đấu" />
      ) : (
        <Box className="list">
          {data.map((t) => (
            <Box key={t.id} className="row" flex flexDirection="column" onClick={open}>
              <Box flex alignItems="center" justifyContent="space-between">
                <Text className="row-title" style={{ flex: 1 }}>
                  {t.name}
                </Text>
                <Icon icon="zi-chevron-right" className="muted" />
              </Box>
              <Text size="xSmall" className="muted" style={{ marginTop: 4 }}>
                🎮 {MODE_LABEL[t.mode] ?? t.mode} · 👥 {t.max_teams} team
                {t.prize_pool ? ` · 💰 ${t.prize_pool}` : ""}
              </Text>
              <Box mt={2}>
                <span className="badge badge-upcoming">{t.status}</span>
              </Box>
            </Box>
          ))}
        </Box>
      )}
    </Page>
  );
}
