import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import {
  AdminCreatorsTable, VerificationQueue, type AdminCreatorRow, type AdminVerificationRow,
} from "@/components/craftland/admin-panels";
import { Pagination } from "@/components/craftland/pagination";
import { requireAdminCapability } from "@/lib/server/admin-access";
import { cleanSearch, tbl } from "@/lib/server/craftland";
import { VERIFIED_BADGE_DISCLAIMER } from "@/lib/constants/craftland";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Craftland — Creator" };

const PAGE_SIZE = 40;

async function mapCounts(ids: string[]) {
  if (ids.length === 0) return new Map<string, number>();
  const { data } = (await tbl("craftland_maps").select("creator_id").in("creator_id", ids).neq("status", "removed").limit(10000)) as unknown as {
    data: Array<{ creator_id: string }> | null;
  };
  const counts = new Map<string, number>();
  for (const r of data ?? []) counts.set(r.creator_id, (counts.get(r.creator_id) ?? 0) + 1);
  return counts;
}

export default async function AdminCraftlandCreatorsPage({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string; filter?: string; page?: string }> }) {
  const access = await requireAdminCapability("craftland.verify.review");
  const sp = await searchParams;
  const tab = sp.tab === "creators" ? "creators" : "verifications";
  const canManage = access.can("craftland.creators.manage");
  const canDecide = access.can("craftland.verify.decide");

  return (
    <div className="space-y-6 text-foreground">
      <div className="border-b border-border pb-4">
        <h1 className="flex items-center gap-2 font-heading text-xl font-bold">
          <BadgeCheck className="size-5 text-sky-500" aria-hidden /> Creator & xác minh
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{VERIFIED_BADGE_DISCLAIMER}</p>
      </div>
      <nav className="flex gap-1 border-b border-border">
        {[{ key: "verifications", label: "Yêu cầu xác minh" }, { key: "creators", label: "Danh sách creator" }].map((t) => (
          <Link key={t.key} href={`/admin/craftland/creators?tab=${t.key}`} aria-current={tab === t.key ? "page" : undefined}
            className={cn("-mb-px border-b-2 px-3 py-2 text-sm font-semibold", tab === t.key ? "border-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>
            {t.label}
          </Link>
        ))}
      </nav>
      {tab === "verifications" ? <Verifications canDecide={canDecide} /> : <Creators sp={sp} canManage={canManage} canDecide={canDecide} />}
    </div>
  );
}

async function Verifications({ canDecide }: { canDecide: boolean }) {
  const { data } = (await tbl("craftland_verification_requests")
    .select("*")
    .in("status", ["pending", "needs_info"])
    .order("created_at", { ascending: true })
    .limit(100)) as unknown as { data: Array<Omit<AdminVerificationRow, "creator">> | null };
  const rows = data ?? [];
  const ids = rows.map((r) => r.creator_id);
  const [counts, creatorsRes] = await Promise.all([
    mapCounts(ids),
    ids.length ? (tbl("craftland_creators").select("user_id, username").in("user_id", ids) as unknown as Promise<{ data: Array<{ user_id: string; username: string }> | null }>) : Promise.resolve({ data: [] }),
  ]);
  const usernames = new Map((creatorsRes.data ?? []).map((c) => [c.user_id, c.username]));
  return (
    <VerificationQueue
      canDecide={canDecide}
      requests={rows.map((r) => ({
        ...r,
        creator: usernames.has(r.creator_id) ? { username: usernames.get(r.creator_id)!, map_count: counts.get(r.creator_id) ?? 0 } : null,
      }))}
    />
  );
}

async function Creators({ sp, canManage, canDecide }: { sp: { q?: string; filter?: string; page?: string }; canManage: boolean; canDecide: boolean }) {
  const page = Math.max(1, Number(sp.page) || 1);
  const term = cleanSearch(sp.q);
  let q = tbl("craftland_creators").select("user_id, username, display_name, status, can_publish, verification_status, created_at, suspended_reason", { count: "exact" });
  if (term) q = q.or(`username.ilike.%${term}%,display_name.ilike.%${term}%`);
  if (sp.filter === "verified") q = q.eq("verification_status", "verified");
  if (sp.filter === "suspended") q = q.eq("status", "suspended");
  if (sp.filter === "no_publish") q = q.eq("can_publish", false);
  const { data, count } = (await q.order("created_at", { ascending: false }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)) as unknown as {
    data: Array<Omit<AdminCreatorRow, "map_count">> | null; count: number | null;
  };
  const rows = data ?? [];
  const counts = await mapCounts(rows.map((r) => r.user_id));

  return (
    <div className="space-y-4">
      <form className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="tab" value="creators" />
        <input name="q" defaultValue={sp.q} placeholder="Username hoặc tên…" maxLength={60} className="h-10 w-60 rounded-lg border border-input bg-card px-3 text-sm" aria-label="Tìm creator" />
        <select name="filter" defaultValue={sp.filter ?? ""} className="h-10 rounded-lg border border-input bg-card px-3 text-sm" aria-label="Lọc">
          <option value="">Tất cả</option>
          <option value="verified">Đã xác minh</option>
          <option value="suspended">Bị khoá</option>
          <option value="no_publish">Bị dừng quyền đăng</option>
        </select>
        <button type="submit" className="h-10 rounded-lg border border-border px-4 text-sm font-medium">Lọc</button>
        <span className="text-sm text-muted-foreground">{count ?? 0} creator</span>
      </form>
      <AdminCreatorsTable creators={rows.map((r) => ({ ...r, map_count: counts.get(r.user_id) ?? 0 }))} canManage={canManage} canDecide={canDecide} />
      <Pagination page={page} total={count ?? 0} pageSize={PAGE_SIZE} basePath="/admin/craftland/creators" params={{ tab: "creators", q: sp.q, filter: sp.filter }} />
    </div>
  );
}
