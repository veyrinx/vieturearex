"use client";

import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { FollowUserButton } from "@/components/common/follow-user-button";
import { ShareButtons } from "@/components/news/share-buttons";
import { createClient } from "@/lib/supabase/client";

type Props = {
  targetUserId: string;
  profileUrl: string;
  title: string;
};

export function ProfileActions({ targetUserId, profileUrl, title }: Props) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [followers, setFollowers] = useState<number | null>(null);
  const [following, setFollowing] = useState<number | null>(null);

  useEffect(() => {
    // Get current user id
    const supabase = createClient();
    if (supabase) {
      supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null)).catch(() => null);
    }
    // Fetch follower/following counts
    fetch(`/api/user/follow-user?target=${targetUserId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { followers?: number; following?: number } | null) => {
        if (d) {
          setFollowers(d.followers ?? 0);
          setFollowing(d.following ?? 0);
        }
      })
      .catch(() => null);
  }, [targetUserId]);

  return (
    <div className="mt-4 space-y-3">
      {/* Follower counts */}
      <div className="flex items-center gap-4 text-xs">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Users className="size-3.5" />
          <strong className="text-foreground tabular-nums">{followers ?? "—"}</strong> followers
        </span>
        <span className="text-muted-foreground/40">·</span>
        <span className="text-muted-foreground">
          <strong className="text-foreground tabular-nums">{following ?? "—"}</strong> following
        </span>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <FollowUserButton
          targetUserId={targetUserId}
          currentUserId={currentUserId}
          onChange={(count) => setFollowers(count)}
        />
        <div className="ml-auto">
          <ShareButtons url={profileUrl} title={title} showLabel={false} />
        </div>
      </div>
    </div>
  );
}
