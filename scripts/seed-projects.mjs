/**
 * One-time script: đổ dữ liệu mẫu cho "Quản lý dự án" (settings key `admin.projects`).
 * Tiến độ sẽ TỰ TÍNH lại trên web dựa vào route + feature-locks; các % dưới đây chỉ
 * áp dụng cho dự án CHƯA có route (manualProgress).
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/seed-projects.mjs
 *   # Thêm --force để ghi đè nếu key đã có dữ liệu.
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://kjqqukageltvdohkakxb.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const KEY = "admin.projects";
const FORCE = process.argv.includes("--force");

if (!SERVICE_KEY) {
  console.error("❌  Chưa set SUPABASE_SERVICE_ROLE_KEY");
  console.error("    Chạy: SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/seed-projects.mjs");
  process.exit(1);
}

const uid = () => Math.random().toString(36).slice(2, 10);

// Mix để minh hoạ đủ trạng thái auto + manual:
const SAMPLE = [
  { id: uid(), name: "So Sánh Nick", category: "Công cụ", path: "/so-sanh-nick",
    description: "So kè 2 UID Free Fire.", priority: "normal" }, // auto → theo web
  { id: uid(), name: "Ước Tính Nick", category: "Công cụ", path: "/dinh-gia-nick",
    description: "Tính điểm độ khủng tài khoản.", priority: "normal" }, // auto → theo feature-lock
  { id: uid(), name: "Bản đồ đội hình", category: "Công cụ", path: "/doi-hinh",
    description: "Công cụ xếp đội hình theo map — đang lên kế hoạch.", priority: "high",
    targetDate: "30/09/2026" }, // chưa có route → planning
  { id: uid(), name: "Nhân vật hợp tác mới", category: "Nội dung",
    description: "Cập nhật dữ liệu nhân vật hợp tác sắp ra (theo roadmap FF).",
    priority: "normal", targetDate: "20/08/2026", manualProgress: 30 }, // manual
  { id: uid(), name: "Chế độ chơi mùa mới", category: "Nội dung",
    description: "Trang giới thiệu chế độ chơi giới hạn thời gian.",
    priority: "low", targetDate: "01/09/2026", manualProgress: 10 }, // manual
];

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function run() {
  const { data: existing } = await supabase.from("settings").select("value").eq("key", KEY).maybeSingle();
  if (existing && !FORCE) {
    let count = 0;
    try { count = JSON.parse(existing.value).length; } catch { /* ignore */ }
    console.log(`ℹ️   Key '${KEY}' đã có ${count} mục. Dùng --force để ghi đè.`);
    process.exit(0);
  }

  const value = JSON.stringify(SAMPLE);
  const { error } = await supabase
    .from("settings")
    .upsert({ key: KEY, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) throw error;

  console.log(`✅  Đã đổ ${SAMPLE.length} dự án mẫu vào '${KEY}'.`);
  console.log("    Xem tại /admin/projects và trang công khai /sap-ra-mat");
}

run().catch((e) => { console.error("❌ ", e.message); process.exit(1); });
