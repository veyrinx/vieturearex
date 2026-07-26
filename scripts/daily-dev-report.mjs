#!/usr/bin/env node
/**
 * Dựng báo cáo công việc dev trong 24h qua từ git log, in ra stdout dạng Markdown.
 * Không có commit nào thì không in gì (workflow dựa vào đó để bỏ qua, không tạo issue rác).
 *
 * Dùng bởi .github/workflows/daily-dev-report.yml, chạy tay được:
 *   node scripts/daily-dev-report.mjs --since "24 hours ago"
 */
import { execFileSync } from "node:child_process";

const SEP = "";
const TZ = "Asia/Ho_Chi_Minh";

const sinceArgIndex = process.argv.indexOf("--since");
const SINCE = sinceArgIndex !== -1 ? process.argv[sinceArgIndex + 1] : "24 hours ago";

function git(args) {
  return execFileSync("git", args, {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    env: { ...process.env, TZ },
  });
}

/** Ngày hôm nay theo giờ VN. */
function vnToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}

// ── Nhóm theo tiền tố conventional commit ────────────────────────────────────
const TYPE_LABELS = [
  ["feat", "Tính năng mới"],
  ["fix", "Sửa lỗi"],
  ["perf", "Tối ưu hiệu năng"],
  ["refactor", "Dọn dẹp mã nguồn"],
  ["revert", "Hoàn tác"],
  ["docs", "Tài liệu"],
  ["test", "Kiểm thử"],
  ["build", "Hạ tầng & build"],
  ["ci", "Hạ tầng & build"],
  ["chore", "Việc vặt"],
];

function classify(subject) {
  const m = /^([a-z]+)(\([^)]*\))?!?:\s*(.+)$/i.exec(subject.trim());
  if (!m) return { type: "other", scope: null, text: subject.trim() };
  const type = m[1].toLowerCase();
  const known = TYPE_LABELS.some(([t]) => t === type);
  return {
    type: known ? type : "other",
    scope: m[2] ? m[2].slice(1, -1) : null,
    text: m[3].trim(),
  };
}

function labelOf(type) {
  return TYPE_LABELS.find(([t]) => t === type)?.[1] ?? "Khác";
}

// ── Đọc commit ───────────────────────────────────────────────────────────────
const raw = git([
  "log",
  `--since=${SINCE}`,
  `--pretty=format:%h${SEP}%an${SEP}%ad${SEP}%s`,
  "--date=format-local:%d/%m %H:%M",
  "--no-merges",
]).trim();

if (!raw) process.exit(0); // Không có commit → không in gì.

const commits = raw.split("\n").map((line) => {
  const [hash, author, date, subject] = line.split(SEP);
  return { hash, author, date, subject, ...classify(subject) };
});

// ── File thay đổi ────────────────────────────────────────────────────────────
const files = new Set();
for (const c of commits) {
  const names = git(["show", "--pretty=format:", "--name-only", c.hash]).trim();
  for (const f of names.split("\n").map((s) => s.trim()).filter(Boolean)) files.add(f);
}
const fileList = [...files];

/** Gom về module dễ đọc thay vì liệt kê từng file. */
function moduleOf(path) {
  const p = path.replace(/\\/g, "/");
  // File nằm ngay trong thư mục gốc của nhóm (layout.tsx, page.tsx…) → gom về "gốc".
  const seg = (i) => {
    const s = p.split("/")[i];
    return !s || s.includes(".") ? "gốc" : s;
  };
  if (p.startsWith("src/app/api/")) return `API · ${seg(3)}`;
  if (p.startsWith("src/app/")) return `Trang · ${seg(2)}`;
  if (p.startsWith("src/components/")) return `Giao diện · ${seg(2)}`;
  if (p.startsWith("src/lib/")) return `Thư viện · ${seg(2)}`;
  if (p.startsWith("supabase/")) return "Cơ sở dữ liệu";
  if (p.startsWith("scripts/")) return "Scripts";
  if (p.startsWith(".github/")) return "CI";
  return p.split("/")[0];
}

const modules = [...new Set(fileList.map(moduleOf))].sort();

// ── Cần chú ý — chỉ dựa trên bằng chứng trong diff ───────────────────────────
const notes = [];

const sqlFiles = fileList.filter((f) => f.endsWith(".sql"));
if (sqlFiles.length > 0) {
  notes.push(`Có thay đổi SQL, cần chạy trên Supabase: ${sqlFiles.map((f) => `\`${f}\``).join(", ")}`);
}

const newEnvVars = new Set();
for (const c of commits) {
  const diff = git(["show", "--pretty=format:", "--unified=0", c.hash]);
  for (const line of diff.split("\n")) {
    if (!line.startsWith("+") || line.startsWith("+++")) continue;
    for (const m of line.matchAll(/process\.env\.([A-Z0-9_]+)/g)) newEnvVars.add(m[1]);
  }
}
if (newEnvVars.size > 0) {
  notes.push(`Biến môi trường được nhắc tới trong code mới: ${[...newEnvVars].map((v) => `\`${v}\``).join(", ")}`);
}

if (fileList.includes("vercel.json")) notes.push("`vercel.json` thay đổi — kiểm tra lại cron và maxDuration.");
if (fileList.includes("middleware.ts") || fileList.includes("src/middleware.ts")) {
  notes.push("Middleware thay đổi — kiểm tra lại luồng đăng nhập và các path công khai.");
}
if (fileList.some((f) => f === "package.json" || f === "package-lock.json")) {
  notes.push("Phụ thuộc npm thay đổi — chạy `npm install` trước khi dev.");
}
if (commits.some((c) => /!:/.test(c.subject) || /^revert/i.test(c.subject))) {
  notes.push("Có commit hoàn tác hoặc breaking change — đọc kỹ trước khi deploy.");
}

// ── Xuất Markdown ────────────────────────────────────────────────────────────
const out = [];
out.push(`## Tổng quan`);
out.push("");
out.push(`${commits.length} commit (khoảng: ${SINCE}), chạm vào ${fileList.length} file.`);
out.push("");

out.push(`## Thay đổi chính`);
out.push("");
const grouped = new Map();
for (const c of commits) {
  const label = labelOf(c.type);
  if (!grouped.has(label)) grouped.set(label, []);
  grouped.get(label).push(c);
}
for (const [label, list] of grouped) {
  const items = list.map((c) => (c.scope ? `${c.scope}: ${c.text}` : c.text));
  out.push(`- **${label}** — ${items.join("; ")}`);
}
out.push("");

out.push(`## Vùng bị ảnh hưởng`);
out.push("");
out.push(modules.map((m) => `- ${m}`).join("\n"));
out.push("");

out.push(`## Cần chú ý`);
out.push("");
out.push(notes.length > 0 ? notes.map((n) => `- ${n}`).join("\n") : "- Không có");
out.push("");

out.push(`## Commit`);
out.push("");
out.push("| Hash | Tác giả | Thời gian | Nội dung |");
out.push("| --- | --- | --- | --- |");
for (const c of commits) {
  out.push(`| \`${c.hash}\` | ${c.author} | ${c.date} | ${c.subject.replace(/\|/g, "\\|")} |`);
}
out.push("");
out.push(`<sub>Tự động dựng từ git log lúc ${vnToday()} (giờ VN).</sub>`);

process.stdout.write(out.join("\n"));
