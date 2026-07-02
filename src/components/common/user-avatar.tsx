"use client";

import { cn } from "@/lib/utils";
import { VerifiedBadge } from "@/components/common/user-badges";

type UserAvatarProps = {
  name: string;
  url?: string | null;
  cssRing?: string | null;
  title?: string | null;
  titleColor?: string | null;
  size?: number;
  showTitle?: boolean;
  className?: string;
};

const GRADIENTS = [
  "from-blue-500 to-indigo-600",
  "from-purple-500 to-pink-600",
  "from-amber-500 to-orange-600",
  "from-emerald-500 to-teal-600",
  "from-red-500 to-rose-600",
  "from-cyan-500 to-sky-600",
];

function gradient(name: string) {
  return GRADIENTS[name.charCodeAt(0) % GRADIENTS.length];
}

export function UserAvatar({
  name,
  url,
  cssRing,
  title,
  titleColor,
  size = 9,
  showTitle = false,
  className,
}: UserAvatarProps) {
  const sz = `size-${size}`;
  const textSz = size <= 8 ? "text-[10px]" : "text-xs";
  const ring = cssRing && cssRing !== "ring-2 ring-border" ? cssRing : null;

  const avatarEl = url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={name}
      className={cn(sz, "rounded-full object-cover shrink-0", ring && "ring-offset-1 ring-offset-background", ring)}
    />
  ) : (
    <div
      className={cn(
        sz,
        "shrink-0 rounded-full bg-gradient-to-br flex items-center justify-center font-black text-white",
        gradient(name),
        textSz,
        ring && "ring-offset-1 ring-offset-background",
        ring,
      )}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );

  if (!showTitle || !title) return avatarEl;

  return (
    <div className={cn("flex flex-col items-center gap-0.5", className)}>
      {avatarEl}
      <span
        className="max-w-[4.5rem] truncate rounded-full px-1.5 py-0 text-[8px] font-black leading-tight tracking-tight"
        style={{ color: titleColor ?? "#6b7280", background: `${titleColor ?? "#6b7280"}18` }}
      >
        {title}
      </span>
    </div>
  );
}

export function UserNameWithTitle({
  name,
  title,
  titleColor,
  role,
  isVerified,
  className,
}: {
  name: string;
  title?: string | null;
  titleColor?: string | null;
  role?: string | null;
  isVerified?: boolean | null;
  className?: string;
}) {
  return (
    <span className={cn("flex flex-wrap items-center gap-1.5", className)}>
      <span className="font-bold text-foreground">{name}</span>
      <VerifiedBadge role={role} isVerified={isVerified} size="sm" />
      {title && (
        <span
          className="rounded-full px-2 py-0.5 text-[9px] font-black leading-none tracking-tight"
          style={{ color: titleColor ?? "#6b7280", background: `${titleColor ?? "#6b7280"}18` }}
        >
          {title}
        </span>
      )}
    </span>
  );
}
