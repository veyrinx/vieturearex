import { NextResponse, type NextRequest } from "next/server";
import {
  SETTINGS_KEY_FAILOVER,
  isSameHost,
  parseFailover,
  shouldSkipFailover,
  type FailoverConfig,
} from "@/lib/constants/failover";

/**
 * Middleware duy nhất đang chạy — chỉ làm MỘT việc: đẩy khách sang máy chủ dự
 * phòng khi công tắc trong /admin/chuyen-huong được bật.
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
let cache: { cfg: FailoverConfig; expires: number } | null = null;

async function loadFailover(): Promise<FailoverConfig | null> {
  const now = Date.now();
  if (cache && now < cache.expires) return cache.cfg;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  // RLS chặn anon đọc bảng settings nên phải là khoá service role. Thiếu khoá
  // thì im lặng bỏ qua — công tắc không chạy còn hơn chặn cả site.
  if (!url || !key) return null;

  try {
    const res = await fetch(
      `${url}/rest/v1/settings?select=value&key=eq.${SETTINGS_KEY_FAILOVER}`,
      {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        cache: "no-store",
        signal: AbortSignal.timeout(2_000),
      },
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as Array<{ value: string }>;
    const cfg = parseFailover(rows?.[0]?.value ?? null);
    cache = { cfg, expires: now + CACHE_TTL_MS };
    return cfg;
  } catch {
    // Giữ giá trị cũ nếu có, để một nhịp mạng lỗi không tự tắt chuyển hướng
    // ngay giữa lúc đang cần nó nhất.
    return cache?.cfg ?? null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (shouldSkipFailover(pathname)) return NextResponse.next();

  const cfg = await loadFailover();
  if (!cfg?.enabled || !cfg.target) return NextResponse.next();

  const host = request.headers.get("host") ?? "";
  // Hai máy đọc chung một dòng cấu hình nên máy đích cũng thấy cờ đang bật.
  // Không có chốt này là khách bị đá vòng tròn.
  if (isSameHost(host, cfg.target)) return NextResponse.next();

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
