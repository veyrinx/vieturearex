import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {
  SETTINGS_KEY_FAILOVER,
  isSameHost,
  parseFailover,
  shouldSkipFailover,
  type FailoverConfig,
} from "@/lib/constants/failover";
import {
  SETTINGS_KEY_FEATURE_LOCKS,
  findFeatureLock,
  parseFeatureLocks,
  shouldSkipFeatureLock,
  type FeatureLock,
} from "@/lib/constants/feature-locks";
import { hasSupabaseEnv, supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";
import { adminRouteRule, canAccessAdminRoute } from "@/lib/constants/admin-routes";
import {
  BUILTIN_ROLE_LEVELS,
  getResolvedRoles,
  getRoleLevel,
  parseRoleCapabilities,
} from "@/lib/permissions";

/**
 * Middleware duy nhất đang chạy. Hai việc:
 *  1. Đẩy khách sang máy chủ dự phòng khi công tắc site.failover bật
 *     (POST /api/admin/failover — trang admin cho công tắc này đã bị gỡ).
 *  2. Chặn các chức năng đang khóa (/admin/feature-locks) → /updating.
 *  3. Chặn quản trị viên vào khu vực /admin không thuộc phần được cấp
 *     (xem `lib/constants/admin-routes.ts`).
 *
 * Việc (2) bắt buộc phải nằm ở đây: layout của (site) không biết đường dẫn hiện
 * tại nên chỉ chặn được bảo trì toàn site, không chặn được từng chức năng.
 *
 * ⚠️ Đừng gộp file `middleware.ts` ở thư mục gốc vào đây. File đó viết cho thời
 * app còn nằm ngoài src/ nên Next chưa từng chạy nó, và luật bên trong đã lệch
 * với thực tế: mọi khách chưa đăng nhập vào một đường không nằm trong
 * PUBLIC_PATHS đều bị trả 404 — kể cả trang chủ. Bật nguyên si là site tắt với
 * người dùng vãng lai.
 *
 * Nguyên tắc của riêng file này: hỏng thì cho đi tiếp. Supabase chậm hay lỗi
 * đều không được phép chặn một request nào.
 */

const CACHE_TTL_MS = 30_000;

type MiddlewareSettings = {
  failover: FailoverConfig | null;
  locks: FeatureLock[];
  /** JSON thô của ma trận phân quyền + vai tự tạo — dùng cho chốt /admin. */
  roleCapabilities: string | null;
  customRoles: string | null;
};

const PERMISSION_KEYS = ["permissions.role_capabilities", "permissions.custom_roles"] as const;

let cache: { data: MiddlewareSettings; expires: number } | null = null;

/**
 * Lấy cả hai dòng cấu hình trong MỘT lượt gọi. Tách làm hai lượt là nhân đôi số
 * request rời khỏi middleware — thứ chạy trên mọi trang.
 */
async function loadSettings(): Promise<MiddlewareSettings | null> {
  const now = Date.now();
  if (cache && now < cache.expires) return cache.data;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  // RLS chặn anon đọc bảng settings nên phải là khoá service role. Thiếu khoá
  // thì im lặng bỏ qua — công tắc không chạy còn hơn chặn cả site.
  if (!url || !key) return null;

  try {
    const res = await fetch(
      `${url}/rest/v1/settings?select=key,value&key=in.(${SETTINGS_KEY_FAILOVER},${SETTINGS_KEY_FEATURE_LOCKS},${PERMISSION_KEYS.join(",")})`,
      {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        cache: "no-store",
        signal: AbortSignal.timeout(2_000),
      },
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as Array<{ key: string; value: string }>;
    const pick = (k: string) => rows?.find((r) => r.key === k)?.value ?? null;
    const data: MiddlewareSettings = {
      failover: parseFailover(pick(SETTINGS_KEY_FAILOVER)),
      locks: parseFeatureLocks(pick(SETTINGS_KEY_FEATURE_LOCKS)),
      roleCapabilities: pick(PERMISSION_KEYS[0]),
      customRoles: pick(PERMISSION_KEYS[1]),
    };
    cache = { data, expires: now + CACHE_TTL_MS };
    return data;
  } catch {
    // Giữ giá trị cũ nếu có, để một nhịp mạng lỗi không tự tắt chuyển hướng
    // ngay giữa lúc đang cần nó nhất.
    return cache?.data ?? null;
  }
}

/**
 * Chỉ gọi khi đường dẫn ĐANG bị khóa — vài trang, lượt truy cập thấp. Đặt ở
 * nhánh chung là mỗi lượt xem đều tốn thêm một vòng hỏi Supabase.
 */
const ADMIN_ROLES = ["super_admin", "admin", "it", "manager", "support"];

/** Vai của người đang gửi request, hoặc null nếu chưa đăng nhập / không tra được. */
async function visitorRole(request: NextRequest): Promise<string | null> {
  if (!hasSupabaseEnv || !supabaseUrl || !supabaseAnonKey) return null;
  try {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get: (name: string) => request.cookies.get(name)?.value,
        // Middleware này không làm mới phiên (updateSession lo việc đó ở nơi
        // khác); ghi cookie ở đây chỉ tổ đá nhau.
        set: () => {},
        remove: () => {},
      },
    });
    const { data } = await supabase.auth.getUser();
    if (!data.user) return null;
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", data.user.id)
      .maybeSingle<{ role: string | null }>();
    return profile?.role ?? null;
  } catch {
    return null;
  }
}

async function isAdminVisitor(request: NextRequest): Promise<boolean> {
  const role = await visitorRole(request);
  return !!role && ADMIN_ROLES.includes(role);
}

/**
 * Chốt phân quyền cho /admin: vào đúng phần được cấp, còn lại đá về dashboard.
 *
 * Chặn ở đây chứ không ở layout vì layout và page render SONG SONG — chuyển
 * hướng từ layout không kịp giữ dữ liệu của page lại trong RSC stream.
 *
 * Không tra được vai (Supabase lỗi, phiên hết hạn) thì cho đi tiếp: khi đó
 * `requireAdminAccess()` trong layout vẫn đứng chặn cửa ngoài, và một nhịp mạng
 * hỏng không nên hất cả đội ngũ ra khỏi trang quản trị.
 */
async function applyAdminGuard(
  request: NextRequest,
  settings: MiddlewareSettings | null,
): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/admin")) return null;
  if (request.method !== "GET") return null;
  // Không có luật riêng (dashboard, changelog, hồ sơ) → khỏi tốn lượt tra vai.
  if (!adminRouteRule(pathname)) return null;

  const role = await visitorRole(request);
  if (!role) return null;

  const resolved = getResolvedRoles(settings?.customRoles ?? null, settings?.roleCapabilities ?? null);
  const matrix = parseRoleCapabilities(settings?.roleCapabilities ?? null);
  const level =
    getRoleLevel(role, resolved) || (BUILTIN_ROLE_LEVELS as Record<string, number>)[role] || 0;

  if (canAccessAdminRoute(pathname, { role, level, matrix, resolved })) return null;

  const url = new URL("/admin", request.url);
  url.searchParams.set("error", "forbidden");
  url.searchParams.set("from", pathname);
  const res = NextResponse.redirect(url, 307);
  res.headers.set("Cache-Control", "no-store");
  return res;
}

/**
 * Chức năng đang khóa → đẩy khách sang /updating (trang đó tự đọc `from` để
 * hiện đúng lời nhắn). Admin vẫn vào được để xem thử, và thấy dải cảnh báo do
 * AdminLockBanner dựng lên.
 */
async function applyFeatureLock(request: NextRequest, locks: FeatureLock[]) {
  if (locks.length === 0) return NextResponse.next();

  const { pathname } = request.nextUrl;
  // Chỉ chặn lượt mở trang. Ảnh, fetch dữ liệu, POST form đều cho đi tiếp.
  if (request.method !== "GET") return NextResponse.next();
  if (shouldSkipFeatureLock(pathname)) return NextResponse.next();
  if (!findFeatureLock(pathname, locks)) return NextResponse.next();
  if (await isAdminVisitor(request)) return NextResponse.next();

  const url = new URL("/updating", request.url);
  url.searchParams.set("from", pathname);
  const res = NextResponse.redirect(url, 307);
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (shouldSkipFailover(pathname)) return NextResponse.next();

  const settings = await loadSettings();

  const forbidden = await applyAdminGuard(request, settings);
  if (forbidden) return forbidden;

  const cfg = settings?.failover ?? null;
  if (!cfg?.enabled || !cfg.target) return applyFeatureLock(request, settings?.locks ?? []);

  const host = request.headers.get("host") ?? "";
  // Hai máy đọc chung một dòng cấu hình nên máy đích cũng thấy cờ đang bật.
  // Không có chốt này là khách bị đá vòng tròn.
  if (isSameHost(host, cfg.target)) return applyFeatureLock(request, settings?.locks ?? []);

  let destination: URL;
  try {
    destination = new URL(pathname + search, cfg.target);
  } catch {
    return NextResponse.next();
  }

  // 307 chứ không phải 301: 301 bị trình duyệt nhớ vĩnh viễn, tắt công tắc rồi
  // mà khách cũ vẫn bị đẩy đi. 307 cũng giữ nguyên method và body nên POST từ
  // Mini App không bị biến thành GET.
  const res = NextResponse.redirect(destination, 307);
  res.headers.set("Cache-Control", "no-store");
  res.headers.set("x-arex-failover", "1");
  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|woff2?|ttf|eot)$).*)",
  ],
};
