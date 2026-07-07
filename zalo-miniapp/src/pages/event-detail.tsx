import React, { useMemo } from "react";
import { Page, Header, Box, Text, Button, Icon } from "zmp-ui";
import { useParams } from "react-router-dom";
import { openWebview } from "zmp-sdk/apis";
import { fetchEvents } from "../api";
import { useAsync } from "../hooks/useAsync";
import { Loading, ErrorState, Empty } from "../components/states";
import { SITE_URL } from "../config";
import type { EventStatus } from "../types";

const STATUS_LABEL: Record<EventStatus, string> = {
  active: "Đang diễn ra",
  upcoming: "Sắp diễn ra",
  expired: "Đã kết thúc",
};

function fmt(iso: string): string {
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function openExternal(url: string) {
  openWebview({ url }).catch(() => window.open(url, "_blank"));
}

export default function EventDetailPage() {
  const { id = "" } = useParams();
  const { data, loading, error, reload } = useAsync(fetchEvents);
  const event = useMemo(() => data?.find((e) => e.id === id) ?? null, [data, id]);

  return (
    <Page className="page">
      <Header title="Sự kiện" />
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState onRetry={reload} />
      ) : !event ? (
        <Empty label="Không tìm thấy sự kiện" />
      ) : (
        <>
          {(event.image_url || event.thumbnail_url) && (
            <img
              className="detail-cover"
              src={event.image_url || event.thumbnail_url}
              alt={event.title}
              loading="lazy"
            />
          )}
          <Box className="post-card" flex flexDirection="column" style={{ gap: 8 }}>
            <Box>
              <span className={`badge badge-${event.status}`}>{STATUS_LABEL[event.status]}</span>
            </Box>
            <Text.Title size="normal">{event.title}</Text.Title>

            <Box flex alignItems="center" style={{ gap: 6, marginTop: 2 }}>
              <Icon icon="zi-calendar" size={16} className="muted" />
              <Text size="xSmall" className="muted">
                {fmt(event.start_date)} → {fmt(event.end_date)}
              </Text>
            </Box>

            {event.description && (
              <Text style={{ marginTop: 8, whiteSpace: "pre-wrap", lineHeight: 1.55 }}>
                {event.description}
              </Text>
            )}
          </Box>

          {event.link && (
            <Button fullWidth onClick={() => openExternal(event.link!)}>
              Tham gia sự kiện
            </Button>
          )}
          <Button variant="secondary" fullWidth onClick={() => openExternal(`${SITE_URL}/events/${event.id}`)}>
            Xem chi tiết trên web
          </Button>
        </>
      )}
    </Page>
  );
}
