import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { getRoleMeta, isStaffRole } from "@/lib/constants/roles";

type Size = "sm" | "md" | "lg";

const CHECK_SIZE: Record<Size, string> = {
  sm: "size-3.5",
  md: "size-4",
  lg: "size-5",
};

/**
 * Tích xanh — blue verified check. Shown when a user is manually verified
 * OR holds a staff role. Pass `force` to always render.
 */
export function VerifiedBadge({
  role,
  isVerified,
  size = "md",
  force,
  className,
}: {
  role?: string | null;
  isVerified?: boolean | null;
  size?: Size;
  force?: boolean;
  className?: string;
}) {
  const show = force || isVerified || isStaffRole(role);
  if (!show) return null;
  return (
    <BadgeCheck
      aria-label="Đã xác minh"
      className={cn(
        CHECK_SIZE[size],
        "shrink-0 fill-blue-500/15 text-blue-500 dark:fill-amber-400/15 dark:text-amber-400",
        className,
      )}
    />
  );
}

const PILL_SIZE: Record<Size, string> = {
  sm: "gap-1 px-1.5 py-0.5 text-[9px] [&>svg]:size-2.5",
  md: "gap-1 px-2 py-0.5 text-[10px] [&>svg]:size-3",
  lg: "gap-1.5 px-2.5 py-0.5 text-xs [&>svg]:size-3.5",
};

/**
 * Role pill (Quản Trị Viên / Kỹ Thuật …). Hidden for plain members
 * unless `showMember` is set. Set `bordered` for the outlined variant.
 */
export function RoleBadge({
  role,
  size = "md",
  showMember = false,
  bordered = false,
  english = false,
  className,
}: {
  role?: string | null;
  size?: Size;
  showMember?: boolean;
  bordered?: boolean;
  english?: boolean;
  className?: string;
}) {
  const meta = getRoleMeta(role);
  if (!meta.staff && !showMember) return null;
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center rounded-full font-bold uppercase tracking-wider",
        meta.color,
        bordered && cn("border", meta.border),
        PILL_SIZE[size],
        className,
      )}
    >
      <Icon />
      {english ? meta.labelEn : meta.label}
    </span>
  );
}

/**
 * Display name + inline verified check. Keeps name and tích xanh aligned.
 */
export function UserName({
  name,
  role,
  isVerified,
  size = "md",
  className,
  checkClassName,
}: {
  name: string;
  role?: string | null;
  isVerified?: boolean | null;
  size?: Size;
  className?: string;
  checkClassName?: string;
}) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1">
      <span className={cn("truncate", className)}>{name}</span>
      <VerifiedBadge role={role} isVerified={isVerified} size={size} className={checkClassName} />
    </span>
  );
}
