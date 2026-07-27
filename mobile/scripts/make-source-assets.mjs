/**
 * Tạo bộ ảnh nguồn cho @capacitor/assets từ logo site.
 *
 *   node scripts/make-source-assets.mjs
 *
 * Sinh ra: resources/icon.png (1024), resources/splash.png +
 * resources/splash-dark.png (2732, logo canh giữa trên nền #0a0a0a).
 * Sau đó chạy `npm run assets` để đổ ra mọi kích thước cho iOS/Android.
 *
 * Muốn dùng logo khác: đặt file PNG vuông vào resources/logo-source.png
 * (script ưu tiên file này thay vì tải từ CDN).
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
const LOGO_URL =
  "https://ik.imagekit.io/VieTureImg/d4c92801-d332-448f-8b28-460fa3ded272.jfif";
const BG = { r: 10, g: 10, b: 10, alpha: 1 };

async function loadLogo() {
  const local = path.join(RES, "logo-source.png");
  try {
    await access(local);
    console.log("• Dùng logo cục bộ: resources/logo-source.png");
    return await readFile(local);
  } catch {
    console.log("• Tải logo từ CDN…");
    const res = await fetch(LOGO_URL);
    if (!res.ok) throw new Error(`Tải logo thất bại: HTTP ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }
}

async function main() {
  await mkdir(RES, { recursive: true });
  const logo = await loadLogo();

  // Icon: logo phủ kín khung 1024 (launcher tự bo góc / mask).
  const icon = await sharp(logo)
    .resize(1024, 1024, { fit: "cover", position: "center" })
    .png()
    .toBuffer();
  await writeFile(path.join(RES, "icon.png"), icon);
  console.log("✓ resources/icon.png");

  // Splash: logo 44% chiều rộng, canh giữa nền tối.
  const mark = await sharp(logo)
    .resize(1200, 1200, { fit: "cover" })
    .composite([
      {
        // bo tròn nhẹ cho đỡ thô
        input: Buffer.from(
          `<svg width="1200" height="1200"><rect width="1200" height="1200" rx="220" ry="220"/></svg>`,
        ),
        blend: "dest-in",
      },
    ])
    .png()
    .toBuffer();

  const splash = await sharp({
    create: { width: 2732, height: 2732, channels: 4, background: BG },
  })
    .composite([{ input: mark, gravity: "center" }])
    .png()
    .toBuffer();

  await writeFile(path.join(RES, "splash.png"), splash);
  await writeFile(path.join(RES, "splash-dark.png"), splash);
  console.log("✓ resources/splash.png + splash-dark.png");
}

main().catch((err) => {
  console.error("✗", err.message);
  process.exit(1);
});
