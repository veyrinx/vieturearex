/**
 * Đẩy bundle web mới của Arex Hub lên Supabase Storage để app tự cập nhật (OTA).
 *
 * Người dùng app chỉ cần bấm "Cập nhật" trong màn Hệ thống, không phải gỡ ra
 * cài lại — và trên iOS thì không phải ký lại bằng Sideloadly.
 *
 * Dùng:
 *   cd mobile-hub && npm version patch --no-git-tag-version && npm run build && cd ..
 *   node scripts/upload-hub-bundle.mjs --notes "Sửa lỗi đăng nhập"
 *
 * Không truyền --version thì lấy luôn version trong mobile-hub/package.json.
 *
 * Đường dẫn trên storage: bundle/<version>/bundle.zip (cùng bucket `app-releases`,
 * nhánh riêng nên không lẫn với file APK/IPA).
 *
 * CHỈ cập nhật được JS/CSS/ảnh trong bundle. Đổi code native (thêm plugin, sửa
 * Info.plist…) vẫn phải dựng lại app và cài lại như thường.
 *
 * Cần SUPABASE_SERVICE_ROLE_KEY (tự đọc .env.local nếu có).
 */

import { createClient } from "@supabase/supabase-js";
import AdmZip from "adm-zip";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const BUCKET = "app-releases";
const DIST_DIR = resolve("mobile-hub/dist");

// .env.local → process.env (không ghi đè biến đã set sẵn ngoài shell)
try {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {
  // không có .env.local thì thôi, đọc từ shell
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("❌  Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : null;
};

// Mặc định lấy version trong mobile-hub/package.json — cùng số mà bundle vừa
// dựng nhúng vào (vite.config.ts → __APP_VERSION__), khỏi lệch giữa số hiển
// thị trong app và số ghi trên storage. --version chỉ để đè khi cần.
const pkgVersion = JSON.parse(readFileSync(resolve("mobile-hub/package.json"), "utf8")).version;
const version = flag("version") ?? pkgVersion;
const notes = flag("notes") ?? "";

if (!version || !/^\d+(\.\d+)*$/.test(version)) {
  console.error(`❌  Version không hợp lệ: "${version}" — sửa mobile-hub/package.json hoặc truyền --version 1.0.1`);
  process.exit(1);
}

if (!existsSync(DIST_DIR)) {
  console.error(`❌  Không thấy ${DIST_DIR} — chạy "cd mobile-hub && npm run build" trước.`);
  process.exit(1);
}

if (!existsSync(resolve(DIST_DIR, "index.html"))) {
  console.error(`❌  ${DIST_DIR} không có index.html — bundle chưa dựng xong?`);
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function run() {
  // Nén NỘI DUNG của dist (index.html nằm ngay gốc zip) — plugin cập nhật giải
  // nén thẳng vào thư mục bundle nên không được bọc thêm một cấp thư mục.
  const zip = new AdmZip();
  zip.addLocalFolder(DIST_DIR);
  const body = zip.toBuffer();

  const path = `bundle/${version}/bundle.zip`;

  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.some((b) => b.name === BUCKET)) {
    console.error(`❌  Chưa có bucket "${BUCKET}" — chạy scripts/upload-app-release.mjs một lần để tạo.`);
    process.exit(1);
  }

  const { error } = await supabase.storage.from(BUCKET).upload(path, body, {
    upsert: true,
    // Bucket giới hạn mimetype theo file cài đặt app; octet-stream nằm trong
    // danh sách đó nên zip đi lọt, khỏi phải nới cấu hình bucket.
    contentType: "application/octet-stream",
    metadata: { version, notes },
  });
  if (error) throw error;

  console.log(`✅  Bundle OTA v${version}  ${(body.length / 1024 / 1024).toFixed(2)} MB`);
  console.log(`    ${path}`);
  if (notes) console.log(`    Ghi chú: ${notes}`);
  console.log(`\n    App sẽ thấy bản này ở Hệ thống → Cập nhật app.`);
}

run().catch((err) => {
  console.error("❌ ", err.message ?? err);
  process.exit(1);
});
