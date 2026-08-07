# Bot Discord Arex

Bot chia làm **hai nửa**, cố ý:

| Nửa | Chạy ở đâu | Lo việc gì |
|---|---|---|
| **HTTP Interactions** | Trong website Next.js — `src/app/api/discord/interactions/route.ts` | Toàn bộ slash command, nút bấm, menu chọn, modal |
| **Gateway bot** | Thư mục này, chạy 24/7 (VPS / Railway / Render) | Tin nhắn thường (OCR ảnh kết quả), thành viên mới, chống spam link, nhịp chốt giveaway & nhắc sự kiện |

Vì sao tách: slash command cần đọc database (chợ, đơn, tài khoản) — để nó chạy
cạnh database trên Vercel thì nhanh và không phải phát khoá Supabase ra ngoài.
Còn sự kiện `messageCreate` / `guildMemberAdd` thì Discord chỉ đẩy qua kết nối
gateway, nên vẫn cần một tiến trình sống liên tục.

---

## 1. Tạo ứng dụng Discord

1. https://discord.com/developers/applications → **New Application**.
2. **Bot** → Reset Token → lưu lại (`DISCORD_BOT_TOKEN`).
3. **Bot → Privileged Gateway Intents**: bật **MESSAGE CONTENT INTENT** và
   **SERVER MEMBERS INTENT**.
4. **General Information**: copy **Application ID** (`DISCORD_APP_ID`) và
   **Public Key** (`DISCORD_PUBLIC_KEY`).
5. **Interactions Endpoint URL**: điền
   `https://arexnetwork.site/api/discord/interactions`
   → Discord bấm thử ngay; phải đã deploy website với `DISCORD_PUBLIC_KEY` thì
   mới lưu được.
6. **OAuth2 → URL Generator**: chọn scope `bot` + `applications.commands`,
   quyền: `Manage Roles`, `Manage Messages`, `Send Messages`,
   `Create Private Threads`, `Send Messages in Threads`, `Embed Links`,
   `Read Message History`. Mời bot vào server bằng URL sinh ra.
7. Kéo role của bot **lên trên** những role nó cần gán, nếu không Discord từ
   chối gán role.

## 2. Đăng ký slash command

```bash
# hiện ngay trong một server (dùng khi thử)
node scripts/discord-register-commands.mjs --guild

# đăng ký toàn cục (Discord đẩy dần, tới 1 tiếng)
node scripts/discord-register-commands.mjs
```

Chạy từ thư mục gốc repo. Script đọc `src/lib/server/discord-commands.ts`, nên
thêm lệnh mới chỉ cần sửa file đó rồi chạy lại.

## 3. Biến môi trường

Đặt trên **Vercel** (cho nửa interactions):

| Biến | Bắt buộc | Dùng để |
|---|---|---|
| `DISCORD_PUBLIC_KEY` | ✅ | Kiểm chữ ký request của Discord |
| `DISCORD_BOT_TOKEN` | ✅ | Gọi REST API: gửi tin, tạo thread, gán role |
| `DISCORD_APP_ID` | ✅ | Đăng ký lệnh |
| `DISCORD_GUILD_ID` | ✅ | Server chính, để đồng bộ role |
| `DISCORD_SHOP_CHANNEL_ID` | | Kênh tự đăng tin chợ mới được duyệt |
| `DISCORD_STAFF_CHANNEL_ID` | | Kênh nội bộ: đơn mới, tranh chấp |
| `DISCORD_TICKET_CHANNEL_ID` | | Kênh chứa các thread ticket |
| `DISCORD_EVENT_CHANNEL_ID` | | Kênh nhắc sự kiện Free Fire |
| `DISCORD_AGENT_ROLE_ID` | | Role giao dịch viên (được ping khi có đơn) |
| `DISCORD_LINKED_ROLE_ID` | | Role cho người đã liên kết tài khoản |
| `DISCORD_SELLER_ROLE_ID` | | Role người bán đã duyệt |
| `DISCORD_STAFF_ROLE_ID` | | Role nhân sự |
| `BOT_API_SECRET` | ✅ | Khoá chung giữa bot và site (`/api/discord/tick`, `/api/discord/sync-roles`) |

Đặt cho **tiến trình bot này**:

| Biến | Bắt buộc | Ghi chú |
|---|---|---|
| `DISCORD_TOKEN` | ✅ | Cùng token với `DISCORD_BOT_TOKEN` |
| `BOT_API_SECRET` | ✅ | Phải trùng với bên site |
| `AREX_SITE_URL` | | Mặc định `https://arexnetwork.site` |
| `DISCORD_TARGET_CHANNEL_ID` | | Kênh nhận ảnh kết quả FF; trống = mọi kênh |
| `DISCORD_WELCOME_CHANNEL_ID` | | Kênh chào thành viên mới |
| `DISCORD_STAFF_ROLE_ID` | | Role được miễn bộ lọc chống spam |
| `DISCORD_TICK_SECONDS` | | Nhịp gọi `/api/discord/tick`, mặc định 60 |

## 4. Chạy bot

```bash
cd discord-bot
npm install
npm run dev      # ts-node, dùng khi phát triển
npm run build && npm start   # bản biên dịch
```

## 5. Danh sách lệnh

| Lệnh | Ai dùng được | Việc |
|---|---|---|
| `/cho tim` | Ai cũng | Tìm tin đang bán, kèm menu xem chi tiết |
| `/cho tin` | Ai cũng | Chi tiết một tin, nút đặt mua |
| `/cho don <mã>` | Đã liên kết & là người trong đơn | Trạng thái đơn, thanh tiến độ |
| `/lienket <mã>` | Ai cũng | Nối tài khoản Arex, tự gán role |
| `/huylienket` | Ai cũng | Gỡ liên kết |
| `/toi` | Đã liên kết | Vai trò, gian hàng, số đơn đang chạy |
| `/ticket` | Ai cũng | Mở thread riêng với đội ngũ |
| `/sukien` | Ai cũng | Sự kiện đang & sắp diễn ra |
| `/giveaway tao` | Nhân sự Arex | Mở giveaway có nút tham gia |
| `/giveaway ketthuc` | Nhân sự Arex | Chốt sớm, bốc ngẫu nhiên |
| `/arex` | Ai cũng | Bảng lối tắt tới các trang |

Mọi lệnh chạm dữ liệu cá nhân đều trả lời dạng **ephemeral** — chỉ người gõ
thấy, không rơi ra kênh chung.

## 6. Bot tự đăng gì ra kênh

* Tin chợ vừa được duyệt → kênh `DISCORD_SHOP_CHANNEL_ID` (embed + ảnh + nút
  đặt mua). Nguồn: `src/lib/server/shop-notify.ts`.
* Đơn mới / tranh chấp → kênh `DISCORD_STAFF_CHANNEL_ID`, ping role giao dịch
  viên.
* Đơn đổi trạng thái → **nhắn riêng** cho người trong đơn đã liên kết tài khoản.
* Sự kiện sắp bắt đầu trong 24 giờ → kênh `DISCORD_EVENT_CHANNEL_ID`, mỗi sự
  kiện chỉ nhắc một lần (bảng `discord_event_reminders`).

## 7. Cần chạy migration

`supabase/migration-shop-v2-discord.sql` — tạo bảng liên kết tài khoản, ticket,
giveaway, và các bảng mới của chợ. Chạy một lần trên Supabase SQL editor.
