/**
 * Đồng bộ số phiên bản iOS theo mobile-hub/package.json.
 *
 *   node scripts/sync-ios-version.mjs
 *
 * Android đã tự đọc package.json ngay trong build.gradle (JsonSlurper), còn
 * Xcode thì không đọc được file JSON, nên phải ghi thẳng vào project.pbxproj.
 * Không có bước này thì bản iOS mãi đứng ở 1.0 trong khi Android đã lên 1.1 —
 * đúng cái bẫy đã xảy ra một lần rồi.
 *
 *   MARKETING_VERSION      = "1.1.0"  (số người dùng thấy)
 *   CURRENT_PROJECT_VERSION = 10100   (build number, phải TĂNG DẦN với App Store;
 *                                      tính như versionCode của Android)
 *
 * Chạy tự động trong `npm run sync`, nên `cap sync` lúc nào cũng ra đúng số.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pbxprojPath = join(root, "ios", "App", "App.xcodeproj", "project.pbxproj");

const { version } = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const parts = version.split("-")[0].split(".").map((n) => Number.parseInt(n, 10) || 0);
const [major = 0, minor = 0, patch = 0] = parts;
const buildNumber = major * 10000 + minor * 100 + patch;

let source;
try {
  source = readFileSync(pbxprojPath, "utf8");
} catch {
  // Chưa chạy `cap add ios` (hoặc đang ở máy Windows chưa lấy thư mục ios) —
  // không phải lỗi, chỉ là không có gì để đồng bộ.
  console.log("Bỏ qua: chưa có dự án iOS.");
  process.exit(0);
}

const before = source;
source = source
  .replace(/MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${version};`)
  .replace(/CURRENT_PROJECT_VERSION = [^;]+;/g, `CURRENT_PROJECT_VERSION = ${buildNumber};`);

if (source === before) {
  console.log(`iOS đã đúng phiên bản ${version} (build ${buildNumber}).`);
  process.exit(0);
}

writeFileSync(pbxprojPath, source);
console.log(`iOS → phiên bản ${version}, build ${buildNumber}.`);
