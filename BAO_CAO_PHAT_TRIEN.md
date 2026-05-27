# BÁO CÁO PHÁT TRIỂN — AREX NETWORK
**Dự án:** Arex Network — Cổng cộng đồng Free Fire  
**Công nghệ:** Next.js 14 (App Router) · Supabase · Tailwind CSS · Vercel  
**Ngày báo cáo:** 28/05/2026  
**Commit:** `0423d2d`

---

## 1. TỔNG QUAN SESSION

Session này tập trung vào **4 nhóm tính năng lớn**:

| # | Nhóm | Mô tả |
|---|------|--------|
| 1 | Hệ thống Achievement | Huy hiệu, độ hiếm, điểm thưởng |
| 2 | Tối ưu giao diện Mobile | Responsive toàn bộ layout |
| 3 | Telegram Auto-Send | Cấu hình gửi tự động khi đăng nội dung |
| 4 | Discord Profile | Webhook hiển thị tên & avatar từ branding |

---

## 2. TÍNH NĂNG MỚI

### 2.1 Hệ thống Achievement (Huy Hiệu)

Hệ thống huy hiệu gamification cho người dùng, gồm 13 thành tích với 5 cấp độ độ hiếm.

#### Cấu trúc dữ liệu

**Bảng `user_achievements`** (`src/lib/sql/migrate_achievements.sql`)
```sql
CREATE TABLE user_achievements (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement TEXT NOT NULL,
  earned_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement)
);
```
- RLS: Chỉ chủ sở hữu đọc được thành tích của mình
- Admin service role đọc để hiển thị profile công khai

#### Danh sách 13 Thành Tích

| ID | Tên | Độ hiếm | Điểm | Cách nhận |
|----|-----|---------|------|-----------|
| `newcomer` | Thành Viên Mới 🎉 | Phổ Thông | +10 | Đăng ký tài khoản |
| `profile_complete` | Hồ Sơ Hoàn Chỉnh ✅ | Phổ Thông | +20 | Điền đủ avatar + bio + FF ID |
| `social_linked` | Kết Nối Xã Hội 🔗 | Hiếm | +15 | Liên kết ≥2 mạng xã hội |
| `two_fa` | Bảo Vệ Tài Khoản 🛡️ | Hiếm | +25 | Bật xác thực 2 yếu tố |
| `verified` | Đã Xác Minh ✔️ | Quý | +50 | Được xác minh bởi Arex |
| `first_comment` | Lần Đầu Góp Giọng 💬 | Phổ Thông | +10 | Bình luận đầu tiên được duyệt |
| `reader_10` | Độc Giả 📰 | Phổ Thông | +10 | Đọc 10 bài viết |
| `reader_50` | Người Đam Mê Tin Tức 📚 | Hiếm | +30 | Đọc 50 bài viết |
| `bookmarker` | Bộ Sưu Tập 🔖 | Phổ Thông | +15 | Lưu 5 bài viết yêu thích |
| `tournament_debut` | Tân Binh Thi Đấu 🏆 | Hiếm | +30 | Tham gia giải đấu đầu tiên |
| `gold_rank` | Đẳng Cấp Gold 🥇 | Quý | — | Đạt 500+ điểm |
| `diamond_rank` | Đẳng Cấp Diamond 💎 | Sử Thi | — | Đạt 5.000+ điểm |
| `master_rank` | Huyền Thoại 👑 | Huyền Thoại | — | Đạt 10.000+ điểm |

#### Độ hiếm (Rarity)

| Cấp | Label | Màu |
|-----|-------|-----|
| Common | Phổ Thông | Xám (slate) |
| Uncommon | Hiếm | Xanh lá (green) |
| Rare | Quý | Xanh dương (blue) |
| Epic | Sử Thi | Tím (purple) |
| Legendary | Huyền Thoại | Vàng (amber) |

#### Files liên quan

| File | Vai trò |
|------|---------|
| `src/lib/constants/achievements.ts` | Định nghĩa 13 achievement, RARITY_META |
| `src/lib/server/award-achievement.ts` | Server logic trao thành tích, idempotent |
| `src/app/api/user/achievements/route.ts` | GET API trả danh sách thành tích của user |
| `src/components/profile/achievements-display.tsx` | UI grid hiển thị huy hiệu (earned + locked) |
| `src/lib/sql/migrate_achievements.sql` | DDL tạo bảng + RLS |

#### Điểm trigger trao thành tích

```
Đăng ký         → newcomer
Bình luận duyệt → first_comment
Lưu 5+ bài     → bookmarker
Cập nhật profile → profile_complete, social_linked
Rank đủ điểm    → gold_rank / diamond_rank / master_rank
```

#### Hiển thị

- **Trang cá nhân** (`/profile`): Tab "Thành Tích" với toggle hiển thị cả locked
- **Trang profile công khai** (`/u/[id]`): Chỉ hiển thị thành tích đã đạt

---

### 2.2 Tính năng bài viết nâng cao

**Bảng `news_reactions`** — Reactions cảm xúc cho bài viết (`src/lib/sql/migrate_reactions_follows.sql`)

```sql
CREATE TABLE news_reactions (
  news_id  TEXT NOT NULL,
  user_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction TEXT NOT NULL CHECK (reaction IN ('fire','heart','wow','haha','sad')),
  UNIQUE(news_id, user_id)
);
```

**Bảng `user_category_follows`** — Theo dõi chuyên mục

```sql
CREATE TABLE user_category_follows (
  user_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  UNIQUE(user_id, category)
);
```

#### Components mới trong trang đọc bài

| Component | Chức năng |
|-----------|-----------|
| `ReadingProgress` | Thanh tiến độ đọc bài ở top trang |
| `ShareButtons` | Nút chia sẻ Facebook, Twitter, copy link |
| `NewsReactions` | 5 emoji reactions (fire/heart/wow/haha/sad) với counter |
| `FollowCategoryButton` | Nút theo dõi/bỏ theo dõi chuyên mục bài viết |

---

## 3. TỐI ƯU GIAO DIỆN MOBILE

### Vấn đề
Giao diện thiết kế cho desktop bị hiển thị nguyên xi trên mobile, gây trải nghiệm xấu.

### Các thay đổi

#### Hero Banner (`src/components/home/hero-banner.tsx`)
- Padding top: `pt-10` → `pt-8 md:pt-10`
- Heading: font-size giảm từ `clamp(3rem,...)` → `clamp(2.4rem,...)`
- Stats: từ `flex-wrap` → `grid grid-cols-3` trên mobile, hàng ngang từ `sm:`
- Countdown boxes: nhỏ hơn trên mobile
- CTA buttons: `flex-col w-full` trên mobile, `flex-row` từ `sm:`

#### Layout trang chủ (`src/app/(site)/page.tsx`)
- Spacing: `space-y-20 md:space-y-24` → `space-y-12 md:space-y-20 lg:space-y-24`

#### Body padding (`src/app/(site)/layout.tsx`)
- `pb-16` → `pb-24 md:pb-16` (tránh bị che bởi bottom nav mobile)

#### Navbar mobile (`src/components/layout/site-navbar.tsx`)
- Ẩn notification bell, push button, theme toggle khỏi top bar trên mobile
- Chuyển các nút này vào cuối Sheet menu mobile

#### Trang đọc bài (`src/app/(site)/news/[slug]/page.tsx`)
- Cover image: `aspect-[16/7]` cố định → `aspect-video md:aspect-[16/7]`

#### News list (`src/components/news/news-list.tsx`)
- Tiêu đề card: `line-clamp-1` → `line-clamp-2 leading-snug`

#### Tournaments (`src/components/home/tournaments-preview.tsx`)
- Banner: `aspect-[16/7]` → `aspect-video md:aspect-[16/7]`

---

## 4. TELEGRAM AUTO-SEND

### Vấn đề
Telegram Bot Admin đã được cấu hình nhưng **không tự động gửi thông báo** khi bài viết được publish tự động (lên lịch qua cron).

### Nguyên nhân
`src/app/api/cron/publish-scheduled/route.ts` chỉ cập nhật DB và revalidate cache, **không gọi bất kỳ notification nào**.

### Giải pháp

#### Fix Cron Route
**File:** `src/app/api/cron/publish-scheduled/route.ts`

Sau khi publish bài lên lịch, gửi đầy đủ:
- Telegram Admin Bot (nội bộ)
- Telegram Public Bot (người dùng)  
- Discord Internal Webhook
- Discord Public Webhook
- Web Push Notification
- User Notify (Telegram user format)
- Broadcast DM tới Mini App subscribers

Có thể tắt qua setting `integrations.tg_auto_scheduled`.

#### Settings Toggle
**File:** `src/components/admin/settings-form.tsx` — thêm card "Tự Động Gửi Thông Báo" trong tab Tích Hợp:

| Setting Key | Mặc định | Ý nghĩa |
|-------------|---------|---------|
| `integrations.tg_auto_news` | Bật | Gửi khi admin đăng bài thủ công |
| `integrations.tg_auto_scheduled` | Bật | Gửi khi cron publish bài lên lịch |
| `integrations.tg_auto_events` | Bật | Gửi khi admin tạo sự kiện |
| `integrations.tg_auto_broadcast_dm` | Bật | Broadcast DM tới Mini App subscribers |

#### Admin News Route
**File:** `src/app/api/admin/news/route.ts`

Trước khi gửi public notification, đọc `tg_auto_news` và `tg_auto_broadcast_dm` từ settings. Admin bot internal luôn nhận thông báo bất kể toggle.

#### Admin Events Route
**File:** `src/app/api/admin/events/route.ts`

Tương tự — đọc `tg_auto_events` và `tg_auto_broadcast_dm` trước khi gửi.

---

## 5. DISCORD PROFILE

### Vấn đề
Discord webhook gửi message hiển thị tên/avatar webhook mặc định (không rõ nguồn gốc).

### Giải pháp
**File:** `src/lib/server/discord-notify.ts`

Thêm `username` và `avatar_url` vào payload Discord webhook, lấy từ:
- **`branding.site_name`** → tên hiển thị trong Discord
- **`branding.logo_light_url`** → avatar trong Discord

```typescript
// Tự động đọc từ settings mỗi lần gửi
const username   = settings["branding.site_name"]     // e.g. "Arex"
const avatar_url = settings["branding.logo_light_url"] // URL logo
```

Áp dụng cho cả `sendDiscordInternalNotification` và `sendDiscordPublicNotification`.

---

## 6. DANH SÁCH FILE THAY ĐỔI

### Files mới tạo (15 files)

| File | Mô tả |
|------|-------|
| `src/lib/sql/migrate_achievements.sql` | DDL bảng user_achievements + RLS |
| `src/lib/sql/migrate_reactions_follows.sql` | DDL bảng news_reactions + user_category_follows + RLS |
| `src/lib/constants/achievements.ts` | 13 achievement definitions + RARITY_META |
| `src/lib/server/award-achievement.ts` | Logic trao huy hiệu (idempotent, fire-and-forget) |
| `src/app/api/user/achievements/route.ts` | GET /api/user/achievements |
| `src/app/api/user/follows/route.ts` | GET/POST /api/user/follows |
| `src/app/api/news/[newsId]/reactions/route.ts` | GET/POST /api/news/[id]/reactions |
| `src/components/profile/achievements-display.tsx` | Grid hiển thị huy hiệu |
| `src/components/news/reading-progress.tsx` | Thanh tiến độ đọc bài |
| `src/components/news/share-buttons.tsx` | Nút chia sẻ |
| `src/components/news/news-reactions.tsx` | Emoji reactions |
| `src/components/news/follow-category-button.tsx` | Nút theo dõi chuyên mục |
| `src/components/layout/mobile-bottom-nav.tsx` | Bottom navigation mobile |
| `src/app/(site)/esports/vod/page.tsx` | Trang VOD Esports |
| `src/app/(site)/esports/vod/_vod-grid.tsx` | Grid VOD |

### Files chỉnh sửa (19 files)

| File | Thay đổi |
|------|---------|
| `src/app/(site)/layout.tsx` | Padding bottom mobile |
| `src/app/(site)/page.tsx` | Spacing responsive |
| `src/app/(site)/profile/page.tsx` | Thêm tab Achievements |
| `src/app/(site)/u/[id]/page.tsx` | Hiển thị achievements công khai |
| `src/app/(site)/news/[slug]/page.tsx` | Reading progress, share, reactions, follow category |
| `src/app/(site)/search/page.tsx` | UI cải thiện |
| `src/app/api/admin/news/route.ts` | Tôn trọng toggle tg_auto_news |
| `src/app/api/admin/events/route.ts` | Tôn trọng toggle tg_auto_events |
| `src/app/api/cron/publish-scheduled/route.ts` | Gửi notifications sau khi auto-publish |
| `src/app/api/news/[newsId]/comments/route.ts` | Award first_comment achievement |
| `src/app/api/user/favorites/route.ts` | Award bookmarker achievement |
| `src/app/api/user/profile/route.ts` | Award profile achievements sau update |
| `src/app/api/user/register/route.ts` | Award newcomer achievement |
| `src/components/admin/settings-form.tsx` | Card toggle tự động gửi |
| `src/components/home/hero-banner.tsx` | Responsive mobile |
| `src/components/home/tournaments-preview.tsx` | Aspect ratio responsive |
| `src/components/layout/site-navbar.tsx` | Ẩn nút khỏi top bar mobile |
| `src/components/news/news-list.tsx` | Line clamp cải thiện |
| `src/lib/server/discord-notify.ts` | Username + avatar từ branding |

---

## 7. HƯỚNG DẪN TRIỂN KHAI

### Bước 1 — Chạy SQL Migration trên Supabase

Mở **Supabase Dashboard → SQL Editor**, chạy lần lượt:

```sql
-- 1. Reactions & Follows
-- Copy nội dung từ: src/lib/sql/migrate_reactions_follows.sql

-- 2. Achievements
-- Copy nội dung từ: src/lib/sql/migrate_achievements.sql
```

### Bước 2 — Deploy lên Vercel

```bash
git push origin main
```

Vercel tự động deploy sau khi push.

### Bước 3 — Cấu hình Settings (Admin Panel)

Vào **Admin → Cài đặt → Tích Hợp**:

1. **Telegram Bot Admin**: Đảm bảo `Token` và `Chat ID` đã nhập
2. **Telegram Bot Public**: Nhập token bot public nếu muốn gửi ra kênh công khai
3. **Tự Động Gửi Thông Báo**: Bật/tắt từng loại theo nhu cầu
4. **Discord**: Nhập webhook URL — tên và avatar site sẽ tự động được lấy từ mục Thương Hiệu

### Bước 4 — Kiểm tra

- [ ] Đăng ký tài khoản mới → nhận huy hiệu "Thành Viên Mới"
- [ ] Lên lịch 1 bài viết → sau giờ publish kiểm tra Telegram nhận được thông báo
- [ ] Gửi test Discord webhook → hiển thị đúng tên và logo site
- [ ] Vào `/profile` → tab Thành Tích hiển thị

---

## 8. GHI CHÚ KỸ THUẬT

### Idempotent Award
Thành tích được trao idempotent — nếu user đã có, DB trả về lỗi `23505` (UNIQUE violation) và bỏ qua, không crash.

### Fire-and-forget
Tất cả lệnh trao thành tích dùng `void` — không block response API, không gây chậm.

### Settings defaults
Tất cả toggle auto-send **mặc định bật** (`!== "false"`). Chỉ tắt khi admin chủ động chọn "Tắt".

### Discord webhook body
```json
{
  "username": "Arex",
  "avatar_url": "https://cdn.../logo.png",
  "embeds": [{ ... }]
}
```

---

*Báo cáo được tạo tự động từ session phát triển ngày 28/05/2026.*
