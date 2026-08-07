/**
 * Đẩy danh sách slash command lên Discord.
 *
 *   node scripts/discord-register-commands.mjs          # toàn cục (tới 1h mới hiện)
 *   node scripts/discord-register-commands.mjs --guild  # chỉ server test, hiện ngay
 *
 * Cần biến môi trường: DISCORD_APP_ID, DISCORD_BOT_TOKEN, và DISCORD_GUILD_ID
 * nếu dùng --guild. Đọc từ .env.local nếu có.
 *
 * Danh sách lệnh lấy từ src/lib/server/discord-commands.ts — file này chỉ đọc,
 * không tự định nghĩa gì, để hai bên không lệch nhau.
 */

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// Nạp .env.local thủ công — script chạy bằng node trần, không qua Next.
for (const file of [".env.local", ".env"]) {
  const path = join(root, file);
  if (!existsSync(path)) continue;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  }
}

const APP_ID = process.env.DISCORD_APP_ID;
const TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = process.env.DISCORD_GUILD_ID;
const guildOnly = process.argv.includes("--guild");

if (!APP_ID || !TOKEN) {
  console.error("Thiếu DISCORD_APP_ID hoặc DISCORD_BOT_TOKEN.");
  process.exit(1);
}
if (guildOnly && !GUILD_ID) {
  console.error("Dùng --guild thì phải có DISCORD_GUILD_ID.");
  process.exit(1);
}

/**
 * Đọc định nghĩa lệnh từ file TypeScript bằng cách bóc mảng literal.
 * Cách này tránh phải cài ts-node chỉ để chạy một script đăng ký.
 */
function loadCommands() {
  const source = readFileSync(join(root, "src/lib/server/discord-commands.ts"), "utf8");
  const start = source.indexOf("export const DISCORD_COMMANDS = [");
  if (start === -1) throw new Error("Không tìm thấy DISCORD_COMMANDS");

  const arrayStart = source.indexOf("[", start);
  let depth = 0;
  let end = arrayStart;
  for (let i = arrayStart; i < source.length; i++) {
    if (source[i] === "[") depth++;
    else if (source[i] === "]") {
      depth--;
      if (depth === 0) { end = i; break; }
    }
  }

  const literal = source
    .slice(arrayStart, end + 1)
    // Hằng OPTION.X → số tương ứng
    .replace(/OPTION\.SUB_COMMAND/g, "1")
    .replace(/OPTION\.STRING/g, "3")
    .replace(/OPTION\.INTEGER/g, "4")
    .replace(/OPTION\.BOOLEAN/g, "5")
    .replace(/OPTION\.USER/g, "6");

  return new Function(`return ${literal};`)();
}

const commands = loadCommands();
const url = guildOnly
  ? `https://discord.com/api/v10/applications/${APP_ID}/guilds/${GUILD_ID}/commands`
  : `https://discord.com/api/v10/applications/${APP_ID}/commands`;

const res = await fetch(url, {
  method: "PUT",
  headers: { Authorization: `Bot ${TOKEN}`, "Content-Type": "application/json" },
  body: JSON.stringify(commands),
});

if (!res.ok) {
  console.error("Đăng ký thất bại:", res.status, await res.text());
  process.exit(1);
}

const registered = await res.json();
console.log(
  `Đã đăng ký ${registered.length} lệnh ${guildOnly ? `cho server ${GUILD_ID}` : "toàn cục"}:`,
);
for (const c of registered) console.log(`  /${c.name} — ${c.description}`);
