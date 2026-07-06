import React from "react";
import { Page, Header, Box } from "zmp-ui";
import { openWebview } from "zmp-sdk/apis";
import { fetchNews } from "../api";
import { useAsync } from "../hooks/useAsync";
import { Loading, ErrorState, Empty } from "../components/states";
import { Row } from "../components/row";
import { SITE_URL } from "../config";

export default function NewsPage() {
  const { data, loading, error, reload } = useAsync(fetchNews);

  const open = (slug: string) => {
    const url = `${SITE_URL}/tin-tuc/${slug}`;
    openWebview({ url }).catch(() => window.open(url, "_blank"));
  };

  return (
    <Page className="page">
      <Header title="Tin tức" />
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState onRetry={reload} />
      ) : !data || data.length === 0 ? (
        <Empty label="Chưa có tin tức" />
      ) : (
        <Box className="list">
          {data.map((n) => (
            <Row
              key={n.id}
              thumb={n.cover}
              title={n.title}
              meta={`${n.category} · ${new Date(n.created_at).toLocaleDateString("vi-VN")}`}
              onClick={() => open(n.slug)}
            />
          ))}
        </Box>
      )}
    </Page>
  );
}
