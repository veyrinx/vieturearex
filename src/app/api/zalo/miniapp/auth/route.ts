import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { ensureUserAccount, getUserByEmail } from "@/lib/data/content-service";

// Đăng nhập 1 chạm bằng Zalo cho Mini App.
// Luồng: mini app gửi accessToken (getAccessToken) + phoneToken (getPhoneNumber,
// tuỳ chọn). Server xác thực với Zalo Open API, lấy zalo id (+ số điện thoại) →
// ánh xạ sang tài khoản Supabase:
//   1. Nếu có SĐT khớp 1 tài khoản Arex sẵn có → dùng tài khoản đó (GỘP).
//   2. Ngược lại → tài khoản tổng hợp zalo_<id>@… (tạo mới nếu chưa có).
// Rồi phát hành email OTP (magic link, KHÔNG gửi email) để mini app verifyOtp
// nhận session, dùng chung hạ tầng Bearer với web.

const ZALO_EMAIL_DOMAIN = "zalo.arexnetwork.site";
// App secret của Mini App: ký appsecret_proof + secret_key khi lấy SĐT.
const APP_SECRET = process.env.ZALO_MINIAPP_APP_SECRET ?? "";
// OA access token (đã có ở webhook) để gọi endpoint lấy SĐT.
const OA_TOKEN = process.env.ZALO_OA_ACCESS_TOKEN ?? "";

type ZaloMe = {
  error?: number;
  id?: string;
  name?: string;
  picture?: { data?: { url?: string } };
};

async function verifyZaloToken(accessToken: string): Promise<ZaloMe | null> {
  const url = new URL("https://graph.zalo.me/v2.0/me");
  url.searchParams.set("fields", "id,name,picture");
  if (APP_SECRET) {
    const { createHmac } = await import("crypto");
    const proof = createHmac("sha256", APP_SECRET).update(accessToken).digest("hex");
    url.searchParams.set("appsecret_proof", proof);
  }
  const res = await fetch(url, { headers: { access_token: accessToken } }).catch(() => null);
  if (!res) return null;
  const data = (await res.json().catch(() => null)) as ZaloMe | null;
  if (!data || data.error || !data.id) return null;
  return data;
}

// Đổi phoneToken (từ getPhoneNumber) lấy số điện thoại thật. Cần OA token +
// app secret; thiếu 1 trong 2 thì bỏ qua (đăng nhập vẫn chạy, chỉ không gộp).
async function resolveZaloPhone(phoneToken: string): Promise<string | null> {
  if (!OA_TOKEN || !APP_SECRET) return null;
  const res = await fetch("https://graph.zalo.me/v2.0/me/info", {
    headers: { access_token: OA_TOKEN, code: phoneToken, secret_key: APP_SECRET },
  }).catch(() => null);
  if (!res) return null;
  const data = (await res.json().catch(() => null)) as { data?: { number?: string } } | null;
  return data?.data?.number ?? null;
}

// Các biến thể SĐT để so khớp (Zalo trả 84…, DB có thể lưu 0… / +84…).
function phoneCandidates(raw: string): string[] {
  const digits = raw.replace(/\D/g, "");
  const set = new Set<string>([digits, `+${digits}`]);
  if (digits.startsWith("84")) {
    set.add(`0${digits.slice(2)}`);
    set.add(digits.slice(2));
  }
  if (digits.startsWith("0")) {
    set.add(`84${digits.slice(1)}`);
    set.add(`+84${digits.slice(1)}`);
  }
  return [...set].filter(Boolean);
}

type Admin = NonNullable<ReturnType<typeof createAdminSupabaseClient>>;

async function findUserByPhone(
  admin: Admin,
  phone: string,
): Promise<{ id: string; email: string } | null> {
  const candidates = phoneCandidates(phone);
  if (candidates.length === 0) return null;
  const { data } = await admin
    .from("users")
    .select("id, email, phone")
    .in("phone", candidates)
    .limit(1)
    .maybeSingle() as { data: { id: string; email: string | null } | null };
  if (!data?.id || !data.email) return null;
  return { id: data.id, email: data.email };
}

export async function POST(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "zalo-miniapp-auth", limit: 20, windowMs: 60_000 });
  if (limited) return limited;

  const body = (await req.json().catch(() => null)) as
    | { accessToken?: string; phoneToken?: string }
    | null;
  const accessToken = body?.accessToken?.trim();
  const phoneToken = body?.phoneToken?.trim();
  if (!accessToken) {
    return NextResponse.json({ error: "Thiếu access token." }, { status: 400 });
  }

  const admin = createAdminSupabaseClient();
  if (!admin) {
    return NextResponse.json({ error: "Server chưa cấu hình." }, { status: 500 });
  }

  const me = await verifyZaloToken(accessToken);
  if (!me?.id) {
    return NextResponse.json({ error: "Không xác thực được tài khoản Zalo." }, { status: 401 });
  }

  const name = me.name?.trim() || `Zalo ${me.id.slice(-4)}`;
  const avatar = me.picture?.data?.url ?? null;
  const phone = phoneToken ? await resolveZaloPhone(phoneToken).catch(() => null) : null;

  let authId: string | null = null;
  let email: string | null = null;

  // 1. Ưu tiên gộp: khớp SĐT với tài khoản Arex sẵn có.
  if (phone) {
    const matched = await findUserByPhone(admin, phone).catch(() => null);
    if (matched) {
      authId = matched.id;
      email = matched.email;
    }
  }

  // 2. Không khớp → tài khoản tổng hợp theo zalo id.
  if (!authId) {
    email = `zalo_${me.id}@${ZALO_EMAIL_DOMAIN}`.toLowerCase();
    const existing = await getUserByEmail(email).catch(() => null);
    if (existing) {
      authId = existing.id;
    } else {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { provider: "zalo", zalo_id: me.id, name, avatar_url: avatar },
      });
      if (createErr && !/already|registered/i.test(createErr.message)) {
        return NextResponse.json({ error: "Không tạo được tài khoản." }, { status: 500 });
      }
      authId = created?.user?.id ?? (await getUserByEmail(email).catch(() => null))?.id ?? null;
      if (authId) {
        await ensureUserAccount({ id: authId, email, role: "user" }).catch(() => {});
        try {
          await admin
            .from("users")
            .update({ display_name: name, avatar_url: avatar, phone: phone ?? undefined } as never)
            .eq("id", authId);
        } catch { /* non-fatal */ }
      }
    }
  }

  if (!authId || !email) {
    return NextResponse.json({ error: "Không khởi tạo được phiên." }, { status: 500 });
  }

  // Phát hành email OTP để mini app đổi lấy session (không gửi email thật).
  const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  const otp = link?.properties?.email_otp;
  if (linkErr || !otp) {
    return NextResponse.json({ error: "Không phát hành được phiên." }, { status: 500 });
  }

  return NextResponse.json({ email, otp, merged: !email.endsWith(ZALO_EMAIL_DOMAIN) });
}
