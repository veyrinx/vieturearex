/**
 * Đẩy file cài app (APK/IPA) lên Supabase Storage để trang /admin/app tải về.
 *
 * Bucket `app-releases` để PRIVATE — trang admin ký signed URL lúc tải, nên
 * link không lộ ra ngoài kể cả khi ai đó đoán được đường dẫn.
 *
 * Dùng:
 *   node scripts/upload-app-release.mjs <file> [--version 1.0.0] [--notes "..."]
 *
 * Tên file trên storage: <platform>/<version>/<tên gốc>
 * platform suy ra từ đuôi file (.apk → android, .ipa → ios).
 *
 * Cần SUPABASE_SERVICE_ROLE_KEY (tự đọc .env.local nếu có).
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, statSync } from "node:fs";
import { basename, extname } from "node:path";

const BUCKET = "app-releases";

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
const file = args.find((a) => !a.startsWith("--"));
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : null;
};

if (!file) {
  console.error("❌  Thiếu đường dẫn file.  node scripts/upload-app-release.mjs <file> [--version 1.0.0]");
  process.exit(1);
}

const ext = extname(file).toLowerCase();
const PLATFORMS = { ".apk": "android", ".aab": "android", ".ipa": "ios" };
const platform = PLATFORMS[ext];
if (!platform) {
  console.error(`❌  Chỉ nhận .apk, .aab, .ipa — nhận được "${ext}"`);
  process.exit(1);
}

const version = flag("version") ?? "1.0.0";
const notes = flag("notes") ?? "";
const body = readFileSync(file);
const size = statSync(file).size;
const path = `${platform}/${version}/${basename(file)}`;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const CONTENT_TYPES = {
  ".apk": "application/vnd.android.package-archive",
  ".aab": "application/octet-stream",
  ".ipa": "application/octet-stream",
};

async function run() {
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.some((b) => b.name === BUCKET)) {
    const { error } = await supabase.storage.createBucket(BUCKET, {
      public: false,
      // Trần global của project (gói free) là 50 MB — đặt cao hơn sẽ bị
      // Supabase từ chối tạo bucket. Vỏ WebView chỉ ~7 MB nên thừa sức.
      fileSizeLimit: 50 * 1024 * 1024,
      allowedMimeTypes: [...new Set(Object.values(CONTENT_TYPES))],
    });
    if (error) throw error;
    console.log(`📦  Đã tạo bucket "${BUCKET}" (private)`);
  }

  const { error } = await supabase.storage.from(BUCKET).upload(path, body, {
    upsert: true,
    contentType: CONTENT_TYPES[ext],
    metadata: { version, notes, platform },
  });
  if (error) throw error;

  console.log(`✅  ${platform}  v${version}  ${(size / 1024 / 1024).toFixed(2)} MB`);
  console.log(`    ${path}`);
}

run().catch((err) => {
  console.error("❌ ", err.message ?? err);
  process.exit(1);
});
