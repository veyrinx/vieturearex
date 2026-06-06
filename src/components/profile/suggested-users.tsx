"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Sparkles, Loader2, UserPlus, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type SuggestedUser = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  role: string | null;
  total_points: number;
  badge: string | null;
};

const BADGE_META: Record<string, { label: string; icon: string; color: string }> = {
  member:   { label: "Thành viên",  icon: "👤", color: "text-muted-foreground" },
  regular:  { label: "Thường xuyên", icon: "✨", color: "text-blue-500" },
  veteran:  { label: "Kỳ cựu",      icon: "🌿", color: "text-green-500" },
  expert:   { label: "Chuyên gia",  icon: "⭐", color: "text-amber-500" },
  legend:   { label: "Huyền Thoại", icon: "👑", color: "text-purple-500" },
};

const AVATAR_GRADIENTS = [
  "from-blue-500 to-indigo-600", "from-purple-500 to-pink-600",
  "from-amber-500 to-orange-600", "from-green-500 to-emerald-600",
  "from-red-500 to-rose-600", "from-cyan-500 to-teal-600",
];

function getGradient(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_GRADIENTS[Math.abs(h) % AVATAR_GRADIENTS.length];
}

export function SuggestedUsers() {
  const [users, setUsers] = useState<SuggestedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/user/suggestions")
      .then((r) => r.json())
      .then((d: { users: SuggestedUser[] }) => setUsers(d.users ?? []))
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  const handleFollow = async (userId: string) => {
    if (busyId) return;
    setBusyId(userId);
    try {
      if (followingIds.has(userId)) {
        const res = await fetch("/api/user/follow-user", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: userId }),
        });
        if (res.ok) {
          setFollowingIds((prev) => {
            const next = new Set(prev);
            next.delete(userId);
            return next;
          });
        }
      } else {
        const res = await fetch("/api/user/follow-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: userId }),
        });
        if (res.status === 401) { toast.error("Đăng nhập để follow"); return; }
        if (res.ok) {
          setFollowingIds((prev) => new Set(prev).add(userId));
          toast.success("Đã follow");
        } else {
          const data = await res.json().catch(() => ({})) as { error?: string };
          toast.error(data.error ?? "Không thể follow");
        }
      }
    } catch {
      toast.error("Lỗi kết nối");
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
        <div className="flex items-center gap-2.5">
          <Sparkles className="size-4 text-primary dark:text-amber-400" />
          <h3 className="text-sm font-black uppercase tracking-[0.15em] text-foreground">Gợi ý follow</h3>
        </div>
        <div className="flex items-center justify-center py-6">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (users.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2.5">
        <Sparkles className="size-4 text-primary dark:text-amber-400" />
        <h3 className="text-sm font-black uppercase tracking-[0.15em] text-foreground">Gợi ý follow</h3>
      </div>

      <div className="space-y-3">
        {users.map((user) => {
          const name = user.display_name ?? "Ẩn danh";
          const initial = name.charAt(0).toUpperCase();
          const gradient = getGradient(user.id);
          const badge = user.badge ? BADGE_META[user.badge] : null;
          const isFollowing = followingIds.has(user.id);
          const isBusy = busyId === user.id;

          return (
            <div key={user.id} className="flex items-center gap-3">
              {/* Avatar */}
              <Link href={`/u/${user.id}`} className="relative size-10 shrink-0 overflow-hidden rounded-full ring-1 ring-border">
                {user.avatar_url ? (
                  <Image src={user.avatar_url} alt={name} fill unoptimized className="object-cover" />
                ) : (
                  <div className={`flex size-full items-center justify-center bg-gradient-to-br ${gradient} text-sm font-black text-white`}>
                    {initial}
                  </div>
                )}
              </Link>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <Link href={`/u/${user.id}`} className="block">
                  <p className="text-sm font-bold text-foreground hover:text-primary dark:hover:text-amber-400 transition-colors truncate">
                    {name}
                  </p>
                </Link>
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  {badge && (
                    <span className={cn("font-semibold", badge.color)}>
                      {badge.icon} {badge.label}
                    </span>
                  )}
                  <span>·</span>
                  <span className="font-bold text-amber-500 tabular-nums">{user.total_points.toLocaleString()}đ</span>
                </div>
              </div>

              {/* Follow button */}
              <button
                type="button"
                onClick={() => handleFollow(user.id)}
                disabled={isBusy}
                className={cn(
                  "flex items-center gap-1 rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all shrink-0",
                  isFollowing
                    ? "border border-border bg-muted/50 text-foreground hover:border-rose-500/40 hover:text-rose-500"
                    : "bg-primary text-primary-foreground hover:opacity-90 dark:bg-amber-500 dark:text-background",
                )}
              >
                {isBusy
                  ? <Loader2 className="size-3 animate-spin" />
                  : isFollowing ? <UserCheck className="size-3" /> : <UserPlus className="size-3" />}
                {isFollowing ? "Đang follow" : "Follow"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
