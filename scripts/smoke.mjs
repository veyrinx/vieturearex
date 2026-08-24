#!/usr/bin/env node
/**
 * Kiểm tra nhanh những đường sống-còn của site sau khi triển khai.
 *
 * Không thay được kiểm thử tự động, nhưng bắt đúng loại hỏng hay gặp nhất ở dự
 * án này: một route đổi mà quên nơi khác, biến môi trường thiếu, Supabase chết,
 * sitemap rơi mất trang. Chỉ gọi GET công khai — không đăng nhập, không ghi gì.
 *
 *   node scripts/smoke.mjs                       # http://localhost:3000
 *   node scripts/smoke.mjs --base https://www.arexnetwork.vn
 *   npm run smoke -- --base https://...
 *
 * Thoát mã 1 nếu có mục nào hỏng — dùng được trong GitHub Actions.
 */

const argBase = (() => {
  const i = process.argv.indexOf("--base");
  return i !== -1 ? process.argv[i + 1] : null;
})();
const BASE = (argBase || process.env.SMOKE_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const TIMEOUT_MS = Number(process.env.SMOKE_TIMEOUT_MS) || 20_000;

/**
 * Mỗi mục: đường dẫn + một hàm kiểm tra nội dung. Trả về chuỗi = mô tả lỗi,
 * trả về null = đạt. Cố ý kiểm tra cả NỘI DUNG chứ không chỉ mã 200: trang lỗi
 * của Next vẫn trả 200 kèm HTML rỗng ruột.
 */
const CHECKS = [
  {
    path: "/api/health",
    name: "Health check",
    check: (body) => (JSON.parse(body).ok === true ? null : "không trả ok:true"),
  },
  {
    path: "/",
    name: "Trang chủ",
    check: (body) =>
      body.includes("<title") ? null : "HTML không có <title> — nhiều khả năng render hỏng",
  },
  {
    path: "/robots.txt",
    name: "robots.txt",
    check: (body) => (body.includes("Sitemap:") ? null : "thiếu dòng Sitemap:"),
  },
  {
    path: "/sitemap.xml",
    name: "Sitemap",
    check: (body) => {
      const count = (body.match(/<loc>/g) || []).length;
      if (count < 50) return `chỉ có ${count} URL — nghi mất dữ liệu`;
      // Các trang lên từ v1.3.0, hay bị quên vì trước đây sitemap khai tay.
      for (const must of ["/check-scam", "/theo-doi-nick", "/shop"]) {
        if (!body.includes(`${must}<`)) return `thiếu ${must}`;
      }
      return null;
    },
  },
  {
    path: "/manifest.webmanifest",
    name: "Manifest PWA",
    check: (body) => (JSON.parse(body).name ? null : "thiếu tên app"),
  },
  {
    path: "/api/news?content=0",
    name: "API tin tức",
    check: (body) => (Array.isArray(JSON.parse(body)?.news ?? JSON.parse(body)) ? null : "không trả mảng"),
  },
  {
    path: "/api/events",
    name: "API sự kiện",
    check: (body) => (body.trim().startsWith("{") || body.trim().startsWith("[") ? null : "không phải JSON"),
  },
  {
    path: "/news",
    name: "Trang tin tức",
    check: (body) => (body.includes("<title") ? null : "render hỏng"),
  },
  {
    path: "/shop",
    name: "Chợ Arex",
    check: (body) => (body.includes("<title") ? null : "render hỏng"),
  },
  {
    path: "/tools",
    name: "Trang công cụ",
    check: (body) => (body.includes("<title") ? null : "render hỏng"),
  },
];

async function run(item) {
  const started = Date.now();
  try {
    const res = await fetch(`${BASE}${item.path}`, {
      redirect: "follow",
      headers: { "user-agent": "arex-smoke/1.0" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const body = await res.text();
    const ms = Date.now() - started;
    if (!res.ok) return { ...item, ok: false, ms, detail: `HTTP ${res.status}` };
    let detail = null;
    try {
      detail = item.check(body);
    } catch (err) {
      detail = `không đọc được nội dung: ${err.message}`;
    }
    return { ...item, ok: !detail, ms, detail };
  } catch (err) {
    return { ...item, ok: false, ms: Date.now() - started, detail: err.message };
  }
}

const results = [];
for (const item of CHECKS) results.push(await run(item));

const pad = (s, n) => String(s).padEnd(n);
console.log(`\nKiểm tra nhanh — ${BASE}\n`);
for (const r of results) {
  console.log(
    `  ${r.ok ? "OK  " : "LỖI "} ${pad(r.name, 22)} ${pad(r.path, 26)} ${pad(`${r.ms}ms`, 8)}${r.detail ?? ""}`,
  );
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} mục đạt.\n`);
process.exit(failed.length ? 1 : 0);
