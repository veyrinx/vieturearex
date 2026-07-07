import React from "react";
import { Page, Header, Box, useNavigate } from "zmp-ui";
import { fetchEvents } from "../api";
import { useAsync } from "../hooks/useAsync";
import { Loading, ErrorState, Empty } from "../components/states";
import { Row } from "../components/row";
import type { EventStatus } from "../types";

const STATUS_LABEL: Record<EventStatus, string> = {
  active: "Đang diễn ra",
  upcoming: "Sắp diễn ra",
  expired: "Đã kết thúc",
};

const ORDER: Record<EventStatus, number> = { active: 0, upcoming: 1, expired: 2 };

export default function EventsPage() {
  const navigate = useNavigate();
  const { data, loading, error, reload } = useAsync(fetchEvents);

  const events = data ? [...data].sort((a, b) => ORDER[a.status] - ORDER[b.status]) : [];

  return (
    <Page className="page">
      <Header title="Sự kiện" />
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState onRetry={reload} />
      ) : events.length === 0 ? (
        <Empty label="Chưa có sự kiện" />
      ) : (
        <Box className="list">
          {events.map((e) => (
            <Row
              key={e.id}
              thumb={e.thumbnail_url || e.image_url}
              title={e.title}
              meta={
                <>
                  <span className={`badge badge-${e.status}`}>{STATUS_LABEL[e.status]}</span>{" "}
                  {new Date(e.start_date).toLocaleDateString("vi-VN")}
                </>
              }
              onClick={() => navigate(`/events/${e.id}`)}
            />
          ))}
        </Box>
      )}
    </Page>
  );
}
