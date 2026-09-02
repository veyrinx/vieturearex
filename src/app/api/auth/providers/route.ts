import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { getSettings } from "@/lib/data/content-service";
import {
  SETTINGS_KEY_SOCIAL_PROVIDERS,
  parseSocialProviders,
} from "@/lib/constants/social-login";

// Public — nút đăng nhập xã hội nào đang được bật (/admin/social-login).
// Trang đăng nhập là client component nên phải hỏi qua đây.
export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "auth-providers", limit: 60, windowMs: 60_000 });
  if (limited) return limited;

  let providers: string[] = [];
  try {
    const settings = await getSettings();
    providers = parseSocialProviders(
      settings.find((s) => s.key === SETTINGS_KEY_SOCIAL_PROVIDERS)?.value ?? null,
    );
  } catch {
    // Hỏng thì không hiện nút nào — thà thiếu còn hơn bày nút chết.
  }

  return NextResponse.json(
    { providers },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
  );
}
