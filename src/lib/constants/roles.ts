import {
  Crown,
  ShieldCheck,
  Wrench,
  UserCog,
  Headset,
  HandCoins,
  Store,
  Users,
  User,
  type LucideIcon,
} from "lucide-react";
import type { UserRole } from "@/lib/types/content";

export type RoleMeta = {
  /** Vietnamese label */
  label: string;
  /** English label */
  labelEn: string;
  icon: LucideIcon;
  /** Tailwind classes: text + subtle bg */
  color: string;
  /** border color class */
  border: string;
  /** ring color class */
  ring: string;
  /** avatar gradient (from-… to-…) */
  gradient: string;
  /** true for staff roles that show a role badge publicly */
  staff: boolean;
};

export const ROLE_META: Record<UserRole, RoleMeta> = {
  super_admin: {
    label: "Quản Trị Tối Cao",
    labelEn: "Super Admin",
    icon: Crown,
    color: "text-red-500 bg-red-500/10",
    border: "border-red-500/30",
    ring: "ring-red-500/30",
    gradient: "from-red-950 via-rose-900 to-pink-950",
    staff: true,
  },
  admin: {
    label: "Quản Trị Viên",
    labelEn: "Admin",
    icon: ShieldCheck,
    color: "text-amber-500 bg-amber-500/10",
    border: "border-amber-500/30",
    ring: "ring-amber-500/30",
    gradient: "from-amber-950 via-orange-900 to-yellow-950",
    staff: true,
  },
  it: {
    label: "Kỹ Thuật",
    labelEn: "IT",
    icon: Wrench,
    color: "text-violet-500 bg-violet-500/10",
    border: "border-violet-500/30",
    ring: "ring-violet-500/30",
    gradient: "from-violet-950 via-purple-900 to-fuchsia-950",
    staff: true,
  },
  manager: {
    label: "Quản Lý",
    labelEn: "Manager",
    icon: UserCog,
    color: "text-blue-500 bg-blue-500/10",
    border: "border-blue-500/30",
    ring: "ring-blue-500/30",
    gradient: "from-blue-950 via-indigo-900 to-blue-950",
    staff: true,
  },
  support: {
    label: "Hỗ Trợ",
    labelEn: "Support",
    icon: Headset,
    color: "text-green-500 bg-green-500/10",
    border: "border-green-500/30",
    ring: "ring-green-500/30",
    gradient: "from-green-950 via-emerald-900 to-teal-950",
    staff: true,
  },
  team_member: {
    label: "Thành Viên Team",
    labelEn: "Team",
    icon: Users,
    color: "text-cyan-500 bg-cyan-500/10",
    border: "border-cyan-500/30",
    ring: "ring-cyan-500/30",
    gradient: "from-cyan-950 via-sky-900 to-blue-950",
    staff: true,
  },
  agent: {
    label: "Giao Dịch Viên",
    labelEn: "Trade Agent",
    icon: HandCoins,
    color: "text-emerald-500 bg-emerald-500/10",
    border: "border-emerald-500/30",
    ring: "ring-emerald-500/30",
    gradient: "from-emerald-950 via-green-900 to-teal-950",
    staff: true,
  },
  seller: {
    label: "Người Bán",
    labelEn: "Seller",
    icon: Store,
    color: "text-orange-500 bg-orange-500/10",
    border: "border-orange-500/30",
    ring: "ring-orange-500/30",
    gradient: "from-orange-950 via-amber-900 to-yellow-950",
    staff: false,
  },
  user: {
    label: "Thành Viên",
    labelEn: "Member",
    icon: User,
    color: "text-muted-foreground bg-muted",
    border: "border-border",
    ring: "ring-border",
    gradient: "from-slate-800 via-slate-700 to-slate-800",
    staff: false,
  },
};

/** Staff roles ordered by seniority — for sorting team lists. */
export const ROLE_ORDER: UserRole[] = [
  "super_admin",
  "admin",
  "it",
  "manager",
  "support",
  "agent",
  "team_member",
];

export function getRoleMeta(role: string | null | undefined): RoleMeta {
  if (role && role in ROLE_META) return ROLE_META[role as UserRole];
  return ROLE_META.user;
}

/** Roles that get the blue verified check automatically. */
export function isStaffRole(role: string | null | undefined): boolean {
  return getRoleMeta(role).staff;
}
