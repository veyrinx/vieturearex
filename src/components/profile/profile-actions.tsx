"use client";

import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { FollowUserButton } from "@/components/common/follow-user-button";
import { ShareButtons } from "@/components/news/share-buttons";
import { FollowersModal } from "@/components/profile/followers-modal";
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
  const [modalType, setModalType] = useState<"followers" | "following" | null>(null);

  useEffect(() => {
    const supabase = createClient();
    if (supabase) {
      supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null)).catch(() => null);
    }
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
      {/* Follower counts — clickable */}
      <div className="flex items-center gap-4 text-xs">
        <button
          type="button"
          onClick={() => followers !== null && followers > 0 && setModalType("followers")}
          disabled={followers === null || followers === 0}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors disabled:cursor-default disabled:hover:text-muted-foreground"
        >
          <Users className="size-3.5" />
          <strong className="text-foreground tabular-nums">{followers ?? "—"}</strong> người theo dõi
        </button>
        <span className="text-muted-foreground/40">·</span>
        <button
          type="button"
          onClick={() => following !== null && following > 0 && setModalType("following")}
          disabled={following === null || following === 0}
          className="text-muted-foreground hover:text-foreground transition-colors disabled:cursor-default disabled:hover:text-muted-foreground"
        >
          <strong className="text-foreground tabular-nums">{following ?? "—"}</strong> đang theo dõi
        </button>
      </div>

      {/* Action row: nút theo dõi bên trái, chia sẻ bên phải — không tràn dòng */}
      <div className="flex items-center justify-between gap-3">
        <FollowUserButton
          targetUserId={targetUserId}
          currentUserId={currentUserId}
          onChange={(count) => setFollowers(count)}
        />
        <ShareButtons url={profileUrl} title={title} showLabel={false} />
      </div>

      {/* Modal */}
      <FollowersModal
        targetUserId={targetUserId}
        type={modalType ?? "followers"}
        open={modalType !== null}
        onClose={() => setModalType(null)}
      />
    </div>
  );
}
