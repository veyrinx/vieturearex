"use client";

import { CommentThread } from "@/components/common/comment-thread";

type Props = { newsId: string };

export function NewsComments({ newsId }: Props) {
  return (
    <CommentThread
      apiPath={`/api/news/${newsId}/comments`}
      realtimeTable="news_comments"
      realtimeFilter={`news_id=eq.${newsId}`}
      realtimeChannel={`comments:${newsId}`}
    />
  );
}
