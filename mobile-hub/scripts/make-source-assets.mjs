/**
 * Tạo bộ ảnh nguồn cho @capacitor/assets — icon + splash của Arex Hub.
 *
 *   node scripts/make-source-assets.mjs && npm run assets
 *
 * Hub cố tình KHÔNG dùng logo Arex Network: hai app nằm cạnh nhau trên màn hình
 * chính, icon phải phân biệt được ngay. Icon Hub là khối gradient tím → lơ với
 * chữ "AX", đúng hình <BrandMark /> trong app.
 *
 * Muốn thay bằng logo riêng: đặt PNG vuông vào resources/logo-source.png.
 */
import { createRequire } from "node:module";
import { mkdir, writeFile, readFile, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// sharp lấy từ node_modules của repo web (đã có sẵn) để khỏi cài lại.
const require = createRequire(path.join(process.cwd(), "..", "package.json"));
const sharp = require("sharp");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RES = path.join(__dirname, "..", "resources");

const BG = { r: 0x07, g: 0x0b, b: 0x14, alpha: 1 };
const ICON_SIZE = 1024;
const SPLASH_SIZE = 2732;

/** Khối gradient bo góc + chữ AX — dùng cho cả icon lẫn logo trên splash. */
function markSvg(size, { rounded = true } = {}) {
  const radius = rounded ? size * 0.22 : 0;
  return Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#7c5cff"/>
      <stop offset="100%" stop-color="#22d3ee"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="url(#g)"/>
  <text x="50%" y="50%" dy="0.35em" text-anchor="middle"
        font-family="Segoe UI, Roboto, Helvetica, Arial, sans-serif"
        font-size="${size * 0.42}" font-weight="800" fill="#070b14"
        letter-spacing="${size * 0.01}">AX</text>
</svg>`);
}

/** Ưu tiên logo cục bộ nếu người dùng đã đặt sẵn. */
async function loadCustomLogo() {
  const local = path.join(RES, "logo-source.png");
  try {
    await access(local);
    console.log("• Dùng logo cục bộ: resources/logo-source.png");
    return await readFile(local);
  } catch {
    return null;
  }
}

async function main() {
  await mkdir(RES, { recursive: true });
  const custom = await loadCustomLogo();

  // ── Icon 1024: launcher tự bo góc/mask nên nền phải phủ kín khung.
  const icon = custom
    ? await sharp(custom).resize(ICON_SIZE, ICON_SIZE, { fit: "cover" }).png().toBuffer()
    : await sharp(markSvg(ICON_SIZE, { rounded: false })).png().toBuffer();
  await writeFile(path.join(RES, "icon.png"), icon);
  console.log("✓ resources/icon.png");

  // ── Splash 2732²: logo ~26% chiều rộng, canh giữa nền #070b14.
  const markSize = Math.round(SPLASH_SIZE * 0.26);
  const mark = custom
    ? await sharp(custom).resize(markSize, markSize, { fit: "cover" }).png().toBuffer()
    : await sharp(markSvg(markSize)).png().toBuffer();

  const splash = await sharp({
    create: { width: SPLASH_SIZE, height: SPLASH_SIZE, channels: 4, background: BG },
  })
    .composite([{ input: mark, gravity: "center" }])
    .png()
    .toBuffer();

  await writeFile(path.join(RES, "splash.png"), splash);
  await writeFile(path.join(RES, "splash-dark.png"), splash);
  console.log("✓ resources/splash.png + splash-dark.png");

  console.log("\nTiếp theo: npm run assets");
}

main().catch((error) => {
  console.error("✗ Lỗi:", error.message);
  process.exit(1);
});
