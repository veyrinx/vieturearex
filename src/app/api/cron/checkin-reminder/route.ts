import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import { getSettings } from "@/lib/data/content-service";
import { runBxhRankNotify } from "@/lib/server/bxh-rank-notify";
import { SITE_URL } from "@/lib/constants/site";
import { withCron } from "@/lib/server/ops-log";

export const runtime = "nodejs";
export const maxDuration = 60;

const TOKEN_KEY = "integrations.telegram_bot_token";

function todayInVN(): string {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }),
  ).toISOString().slice(0, 10);
}

// Nhắc điểm danh: DM người đã LIÊN KẾT + BẬT thông báo + hôm nay CHƯA điểm danh.
// Chạy ké luôn nhịp BXH buổi tối vì plan Hobby chỉ cho mỗi cron 1 lần/ngày.
export const GET = withCron("checkin-reminder", async () => {

  const bxh = await runBxhRankNotify().catch(() => null);

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ sent: 0, reason: "no_db", bxh });

  const settings = await getSettings();
  const token = settings.find((s) => s.key === TOKEN_KEY)?.value ?? "";
  if (!token) return NextResponse.json({ sent: 0, reason: "not_configured", bxh });

  const [{ data: links }, { data: subs }] = await Promise.all([
    untypedFrom(db, "telegram_account_links").select("telegram_user_id, users(last_login_date)") as unknown as Promise<{
      data: Array<{ telegram_user_id: number; users: { last_login_date: string | null } | null }> | null;
    }>,
    untypedFrom(db, "telegram_subscribers").select("telegram_user_id").eq("active", true) as unknown as Promise<{
      data: Array<{ telegram_user_id: number }> | null;
    }>,
  ]);

  const subSet = new Set((subs ?? []).map((s) => s.telegram_user_id));
  const today = todayInVN();
  const miniApp = `${SITE_URL}/tg/profile`;

  let sent = 0;
  for (const l of links ?? []) {
    if (!subSet.has(l.telegram_user_id)) continue;
    if (l.users?.last_login_date === today) continue; // đã điểm danh

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: l.telegram_user_id,
        text: "🔥 <b>Đừng để mất chuỗi!</b>\nHôm nay bạn chưa điểm danh. Gõ /diemdanh hoặc bấm nút bên dưới để nhận điểm & giữ chuỗi.",
        parse_mode: "HTML",
        disable_web_page_preview: true,
        reply_markup: { inline_keyboard: [[{ text: "🔥 Điểm danh ngay", web_app: { url: miniApp } }]] },
      }),
    }).catch(() => null);

    if (res?.ok) sent++;
    else if (res) {
      const err = (await res.json().catch(() => ({}))) as { error_code?: number };
      if (err.error_code === 403) {
        await untypedFrom(db, "telegram_subscribers").update({ active: false } as never).eq("telegram_user_id", l.telegram_user_id);
      }
    }
  }

  return NextResponse.json({ sent, bxh });
});
