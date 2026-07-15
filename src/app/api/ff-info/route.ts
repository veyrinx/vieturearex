import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";

// Tự động lấy thông tin CƠ BẢN (tên, level, rank) từ ID Free Fire của chính người đăng nhập.
// KHÔNG có API chính thức của Garena — dùng API bên thứ 3, cấu hình qua env:
//   FF_INFO_API_URL = template có {uid} và {region}, vd:
//     https://your-host/api/v1/account?region={region}&uid={uid}
//   FF_INFO_REGION  = region mặc định (mặc định "VN")
// Trả về inventory/skin? => KHÔNG. Garena không lộ dữ liệu túi đồ ở bất kỳ đâu.

// Map điểm rank (rankingPoints) -> key rank trong máy định giá. Best-effort, chỉnh nếu lệch mùa.
const RANK_BY_POINTS: { min: number; key: string }[] = [
  { min: 2600, key: "gm" },
  { min: 1900, key: "heroic" },
  { min: 1600, key: "diamond" },
  { min: 1400, key: "plat" },
  { min: 1200, key: "gold" },
  { min: 1000, key: "silver" },
  { min: 0, key: "bronze" },
];

function rankKeyFromPoints(points?: number | null): string | null {
  if (typeof points !== "number" || !Number.isFinite(points)) return null;
  return RANK_BY_POINTS.find((r) => points >= r.min)?.key ?? null;
}

// Các API cộng đồng dùng casing khác nhau: basicInfo / BasicInfo / basicinfo
function pick<T = unknown>(obj: Record<string, unknown>, ...keys: string[]): T | undefined {
  for (const k of keys) {
    if (obj && typeof obj === "object" && k in obj) return obj[k] as T;
    const found = Object.keys(obj ?? {}).find((x) => x.toLowerCase() === k.toLowerCase());
    if (found) return obj[found] as T;
  }
  return undefined;
}

export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "ff-info", limit: 10, windowMs: 60_000 });
  if (limited) return limited;

  const template = process.env.FF_INFO_API_URL?.trim();
  if (!template) {
    return NextResponse.json(
      { error: "Tính năng tự động lấy dữ liệu chưa được cấu hình.", notConfigured: true },
      { status: 501 },
    );
  }

  const supabase = createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Unauth" }, { status: 401 });
  const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
  if (!user) return NextResponse.json({ error: "Hãy đăng nhập." }, { status: 401 });

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const { data: profile } = (await untypedFrom(db, "users")
    .select("ff_id")
    .eq("id", user.id)
    .maybeSingle()) as { data: { ff_id: string | null } | null };

  const ffId = profile?.ff_id?.trim();
  if (!ffId) {
    return NextResponse.json(
      { error: "Hãy liên kết ID Free Fire trong hồ sơ trước.", needFfId: true },
      { status: 400 },
    );
  }

  const region = (process.env.FF_INFO_REGION?.trim() || "VN").toUpperCase();
  const url = template
    .replace(/\{uid\}/gi, encodeURIComponent(ffId))
    .replace(/\{region\}/gi, encodeURIComponent(region));

  let raw: Record<string, unknown>;
  try {
    const ctrl = AbortSignal.timeout(9000);
    const res = await fetch(url, { signal: ctrl, headers: { accept: "application/json" } });
    if (!res.ok) {
      return NextResponse.json(
        { error: `Không lấy được dữ liệu (ID không tồn tại hoặc API lỗi ${res.status}).` },
        { status: 502 },
      );
    }
    raw = (await res.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: "API dữ liệu FF đang không phản hồi. Vui lòng nhập tay." },
      { status: 502 },
    );
  }

  const basic = (pick<Record<string, unknown>>(raw, "basicInfo", "AccountInfo", "account_info") ?? raw) as Record<string, unknown>;
  const nickname = pick<string>(basic, "nickname", "name") ?? null;
  const level = Number(pick(basic, "level", "accountLevel")) || null;
  const points = Number(pick(basic, "rankingPoints", "rank_points", "brRankPoint")) || null;
  const rankKey = rankKeyFromPoints(points);

  return NextResponse.json({
    ff_id: ffId,
    region,
    nickname,
    level,
    rankingPoints: points,
    rankKey,
  });
}
