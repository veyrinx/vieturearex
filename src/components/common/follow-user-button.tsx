"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { UserPlus, UserCheck, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  targetUserId: string;
  /** Hide when viewing own profile */
  currentUserId?: string | null;
  className?: string;
  onChange?: (followers: number, isFollowing: boolean) => void;
};

export function FollowUserButton({ targetUserId, currentUserId, className, onChange }: Props) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followers, setFollowers] = useState(0);

  useEffect(() => {
    fetch(`/api/user/follow-user?target=${targetUserId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { isFollowing?: boolean; followers?: number } | null) => {
        if (d) {
          setIsFollowing(d.isFollowing ?? false);
          setFollowers(d.followers ?? 0);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [targetUserId]);

  // Hide button when viewing own profile
  if (currentUserId && currentUserId === targetUserId) return null;

  const toggle = async () => {
    if (busy || loading) return;
    setBusy(true);
    try {
      if (isFollowing) {
        const res = await fetch("/api/user/follow-user", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: targetUserId }),
        });
        if (res.status === 401) { toast.error("Đăng nhập để follow"); return; }
        if (res.ok) {
          setIsFollowing(false);
          const next = Math.max(0, followers - 1);
          setFollowers(next);
          onChange?.(next, false);
          toast.success("Đã bỏ follow");
        }
      } else {
        const res = await fetch("/api/user/follow-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: targetUserId }),
        });
        if (res.status === 401) { toast.error("Đăng nhập để follow"); return; }
        if (res.ok) {
          setIsFollowing(true);
          const next = followers + 1;
          setFollowers(next);
          onChange?.(next, true);
          toast.success("Đã follow");
        } else {
          const data = await res.json().catch(() => ({})) as { error?: string };
          toast.error(data.error ?? "Không thể follow");
        }
      }
    } catch {
      toast.error("Lỗi kết nối");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading || busy}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all",
        isFollowing
          ? "border border-border bg-muted/50 text-foreground hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-500"
          : "bg-primary text-primary-foreground hover:opacity-90 shadow-sm dark:bg-amber-500 dark:text-background",
        (loading || busy) && "opacity-60 cursor-wait",
        className,
      )}
    >
      {busy ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : isFollowing ? (
        <UserCheck className="size-3.5" />
      ) : (
        <UserPlus className="size-3.5" />
      )}
      <span className={isFollowing ? "group-hover:hidden" : ""}>
        {isFollowing ? "Đang follow" : "Follow"}
      </span>
    </button>
  );
}
