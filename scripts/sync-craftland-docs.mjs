#!/usr/bin/env node
/**
 * Đồng bộ CHỈ MỤC tài liệu Craftland chính thức của Garena về
 * src/lib/data/craftland-api-index.json để Craftland Academy tra cứu.
 *
 * Chỉ lấy thông tin giao diện mang tính dữ kiện: tên mục, nhóm module, cờ hết
 * hạn, chữ ký khai báo (`func ...`) và tên + kiểu của tham số. KHÔNG lấy phần
 * mô tả, ví dụ hay hình ảnh của Garena — mỗi mục link về trang gốc.
 *
 * Chạy: node scripts/sync-craftland-docs.mjs [--limit=N]
 * Tuần tự, nghỉ 400ms giữa các request để không gây tải cho máy chủ Garena.
 */
import fs from "node:fs";
import path from "node:path";

const BASE = "https://ffcraftland.garena.com/vn/docs";
const OUT = path.resolve("src/lib/data/craftland-api-index.json");
const DELAY_MS = 400;
const limitArg = process.argv.find((a) => a.startsWith("--limit="));
const LIMIT = limitArg ? Number(limitArg.split("=")[1]) : Infinity;
const UA = "ArexNetwork-Academy-Indexer/1.0 (+https://www.arexnetwork.vn)";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchNuxtData(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      const m = /id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/.exec(html);
      if (!m) throw new Error("no __NUXT_DATA__");
      return JSON.parse(m[1]);
    } catch (err) {
      if (attempt === 2) throw err;
      await sleep(1500 * (attempt + 1));
    }
  }
}

/** Payload Nuxt là mảng phẳng; số nguyên trong object là chỉ số trỏ tới phần tử khác. */
function resolver(data) {
  const R = (i) => (typeof i === "number" ? data[i] : i);
  const res = (x, d = 0) => {
    if (d > 40) return null;
    if (Array.isArray(x)) return x.map((v) => res(R(v), d + 1));
    if (x && typeof x === "object") return Object.fromEntries(Object.entries(x).map(([k, v]) => [k, res(R(v), d + 1)]));
    return x;
  };
  return { R, res };
}

function buildTree(data) {
  const { R, res } = resolver(data);
  const roots = data
    .filter((d) => d && typeof d === "object" && !Array.isArray(d) && "children" in d && "url" in d && ["api", "event", "type"].includes(R(d.url)))
    .map((d) => res(d));
  const sections = {};
  for (const root of roots) {
    const groups = [];
    for (const g of root.children ?? []) {
      const items = [];
      const walk = (n) => {
        if (n.children?.length) n.children.forEach(walk);
        else if (n.url) items.push({ title: n.title.trim(), slug: n.url, obsolete: !!n.obsoleted });
      };
      if (g.children?.length) g.children.forEach(walk);
      else if (g.url) items.push({ title: g.title.trim(), slug: g.url, obsolete: !!g.obsoleted });
      groups.push({ title: g.title.trim(), items });
    }
    sections[root.url] = { title: root.title.trim(), groups };
  }
  return sections;
}

/**
 * Từ markdown của một trang: chữ ký trong khối ```go và bảng tham số.
 * Chỉ giữ cột Tên + Kiểu; bỏ cột Mô tả.
 */
function extractInterface(markdown) {
  const signature = [...markdown.matchAll(/```go\n([\s\S]*?)```/g)].map((m) => m[1].trim()).join("\n") || null;
  const params = { input: [], output: [] };
  let mode = null;
  for (const line of markdown.split("\n")) {
    if (/^##\s*Input/i.test(line)) mode = "input";
    else if (/^##\s*Output/i.test(line)) mode = "output";
    else if (/^#\s/.test(line)) mode = null;
    else if (mode && /^\|/.test(line) && !/^\|\s*-/.test(line) && !/^\|\s*Tên\s*\|/.test(line)) {
      const cells = line.split("|").slice(1, -1).map((c) => c.trim());
      if (cells.length >= 2) {
        const type = cells[1].replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
        params[mode].push({ name: cells[0], type });
      }
    }
  }
  return { signature, input: params.input, output: params.output };
}

function findMarkdown(data) {
  return data.find((x) => typeof x === "string" && /^# Khai báo/m.test(x)) ?? null;
}

async function main() {
  console.log("Đọc cây tài liệu…");
  const sections = buildTree(await fetchNuxtData(`${BASE}/module-1/`));
  const items = Object.entries(sections)
    .filter(([key]) => key === "api" || key === "event")
    .flatMap(([, s]) => s.groups.flatMap((g) => g.items));
  console.log(`API + sự kiện: ${items.length} trang`);

  let done = 0;
  let failed = 0;
  for (const item of items.slice(0, LIMIT)) {
    try {
      const md = findMarkdown(await fetchNuxtData(`${BASE}/${item.slug}`));
      if (md) Object.assign(item, extractInterface(md));
    } catch (err) {
      failed++;
      console.warn(`  ! ${item.slug}: ${err.message}`);
    }
    if (++done % 50 === 0) console.log(`  ${done}/${Math.min(items.length, LIMIT)}`);
    await sleep(DELAY_MS);
  }

  const out = {
    source: `${BASE}/`,
    syncedAt: new Date().toISOString(),
    note: "Chỉ mục giao diện (tên, chữ ký, kiểu tham số). Mô tả và ví dụ đầy đủ xem tại tài liệu chính thức của Garena.",
    sections,
  };
  fs.writeFileSync(OUT, JSON.stringify(out));
  console.log(`Xong: ${done} trang, ${failed} lỗi → ${path.relative(process.cwd(), OUT)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
