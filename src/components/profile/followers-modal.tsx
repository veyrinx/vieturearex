"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { X, Users, Loader2, BadgeCheck } from "lucide-react";

type UserLite = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  role: string | null;
};

const ROLE_BADGE: Record<string, { label: string; color: string }> = {
  super_admin: { label: "Super Admin", color: "text-red-500 bg-red-500/10" },
  admin:       { label: "Admin",       color: "text-amber-500 bg-amber-500/10" },
  it:          { label: "IT",          color: "text-violet-500 bg-violet-500/10" },
  manager:     { label: "Quản Lý",     color: "text-blue-500 bg-blue-500/10" },
  support:     { label: "CSKH",        color: "text-green-500 bg-green-500/10" },
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

type Props = {
  targetUserId: string;
  type: "followers" | "following";
  open: boolean;
  onClose: () => void;
};

export function FollowersModal({ targetUserId, type, open, onClose }: Props) {
  const [users, setUsers] = useState<UserLite[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch(`/api/user/follow-user/list?target=${targetUserId}&type=${type}`)
      .then((r) => (r.ok ? r.json() : { users: [] }))
      .then((d: { users: UserLite[] }) => setUsers(d.users ?? []))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, [open, targetUserId, type]);

  useEffect(() => {
    if (!open) return;
    const onEscape = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md max-h-[80vh] rounded-3xl border border-border bg-card overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-xl bg-primary/10 dark:bg-amber-400/10">
              <Users className="size-4 text-primary dark:text-amber-400" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground">
                {type === "followers" ? "Followers" : "Following"}
              </p>
              <p className="text-sm font-bold text-foreground">
                {type === "followers" ? "Người theo dõi" : "Đang theo dõi"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* List */}
        <div className="max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
              <span className="text-sm">Đang tải...</span>
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <Users className="size-10 text-muted-foreground/30" />
              <p className="text-sm font-semibold text-muted-foreground">
                {type === "followers" ? "Chưa có người follow" : "Chưa follow ai"}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border/40">
              {users.map((user) => {
                const name = user.display_name ?? "Ẩn danh";
                const initial = name.charAt(0).toUpperCase();
                const badge = user.role ? ROLE_BADGE[user.role] : null;
                const gradient = getGradient(user.id);

                return (
                  <li key={user.id}>
                    <Link
                      href={`/u/${user.id}`}
                      onClick={onClose}
                      className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/40"
                    >
                      {/* Avatar */}
                      <div className="relative size-10 shrink-0 overflow-hidden rounded-full ring-1 ring-border">
                        {user.avatar_url ? (
                          <Image src={user.avatar_url} alt={name} fill unoptimized className="object-cover" />
                        ) : (
                          <div className={`flex size-full items-center justify-center bg-gradient-to-br ${gradient} text-sm font-black text-white`}>
                            {initial}
                          </div>
                        )}
                      </div>

                      {/* Name + badge */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-bold text-foreground truncate">{name}</p>
                          {user.role === "super_admin" && (
                            <BadgeCheck className="size-3.5 shrink-0 text-blue-500 dark:text-amber-400" />
                          )}
                        </div>
                        {badge && (
                          <span className={`inline-flex rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider mt-0.5 ${badge.color}`}>
                            {badge.label}
                          </span>
                        )}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        {users.length > 0 && users.length >= 100 && (
          <div className="border-t border-border px-5 py-2.5 text-center">
            <p className="text-[10px] text-muted-foreground">Hiển thị 100 đầu tiên</p>
          </div>
        )}
      </div>
    </div>
  );
}
