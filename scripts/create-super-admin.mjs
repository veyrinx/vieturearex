/**
 * One-time script: create super_admin account
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=<your_key> node scripts/create-super-admin.mjs
 *
 * Get your service role key from:
 *   Supabase Dashboard → Project Settings → API → service_role (secret)
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://ukelbkocjktbpjiogogl.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const EMAIL = "vieturegroup@gmail.com";
const PASSWORD = "Admin@Arex@2026!";
const DISPLAY_NAME = "Quản Trị Viên";

if (!SERVICE_KEY || SERVICE_KEY === "YOUR_SUPABASE_SERVICE_ROLE_KEY") {
  console.error("❌  Chưa set SUPABASE_SERVICE_ROLE_KEY");
  console.error("    Chạy lại: SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/create-super-admin.mjs");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function run() {
  console.log(`📧  Email   : ${EMAIL}`);
  console.log(`🔑  Role    : super_admin`);
  console.log("");

  // Check if auth user already exists
  const { data: { users }, error: listErr } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listErr) throw listErr;

  let userId;
  const existing = users.find((u) => u.email === EMAIL);

  if (existing) {
    console.log(`ℹ️   Auth user đã tồn tại (${existing.id})`);
    // Update password
    const { error: pwErr } = await supabase.auth.admin.updateUserById(existing.id, { password: PASSWORD });
    if (pwErr) throw pwErr;
    console.log("✅  Đã cập nhật mật khẩu");
    userId = existing.id;
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
    });
    if (error) throw error;
    userId = data.user.id;
    console.log(`✅  Tạo auth user thành công (${userId})`);
  }

  // Upsert profile in users table
  const { error: upsertErr } = await supabase.from("users").upsert(
    {
      id: userId,
      email: EMAIL,
      display_name: DISPLAY_NAME,
      role: "super_admin",
      is_banned: false,
    },
    { onConflict: "id" },
  );
  if (upsertErr) throw upsertErr;
  console.log("✅  Role super_admin đã được gán trong bảng users");
  console.log("");
  console.log("🎉  Hoàn tất! Đăng nhập với:");
  console.log(`    Email   : ${EMAIL}`);
  console.log(`    Password: ${PASSWORD}`);
}

run().catch((err) => {
  console.error("❌  Lỗi:", err.message ?? err);
  process.exit(1);
});
