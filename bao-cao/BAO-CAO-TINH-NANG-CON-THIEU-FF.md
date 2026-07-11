# BÁO CÁO: TÍNH NĂNG FREE FIRE CÒN THIẾU & ĐỀ XUẤT MỞ RỘNG

**Dự án:** Arex Network — Cổng cộng đồng Free Fire
**Công nghệ:** Next.js 15 · Supabase · Tailwind · Vercel
**Ngày:** 10/07/2026 · **Nhánh:** `main`

---

## 0. Tóm tắt

Arex hiện đã rất mạnh về **nền tảng cộng đồng chung** (tin tức, diễn đàn, gamification, giải đấu TMS, tích hợp đa kênh). Tuy nhiên phần **"chất Free Fire" chuyên sâu còn mỏng**:

| Hiện có | Thực chất | Hạn chế |
|---|---|---|
| `items` | Catalog **icon** (ID → ảnh) | Không có chỉ số, không mô tả |
| `wiki` | Bài wiki chung | Chưa cấu trúc theo nhân vật/súng/pet |
| `characters/vote` | Chỉ **bình chọn** nhân vật | Không có tier list / dữ liệu kỹ năng |
| `ff-version-check` (cron) | Dò phiên bản FF | Chưa hiển thị patch notes |
| `streams/sync` | Đồng bộ luồng | Chưa có hồ sơ streamer |

**Chưa có:** Mã đổi thưởng, tra cứu FF ID, tier list meta, kho pet/súng/skin chi tiết, sensitivity/loadout, bracket viewer, scrim finder, clan/bang hội.

Xếp hạng theo **giá trị × độ dễ triển khai** (tận dụng hạ tầng sẵn có: cron, push, Telegram/Discord, Supabase, TMS).

---

## 1. 🔴 ƯU TIÊN CAO — Kéo traffic & giữ chân

### 1.1. Mã Đổi Thưởng (Redeem Codes) ⭐ NÊN LÀM ĐẦU TIÊN
> Từ khóa hút traffic bậc nhất của cộng đồng FF. Người chơi tìm code MỖI NGÀY.

- **Trang** `/ma-doi-thuong` (hoặc `/redeem-codes`): danh sách code còn hạn / hết hạn, nút copy, hướng dẫn đổi, thời gian hết hạn, khu vực (VN/SEA).
- **Tự động:** cron crawl trang Garena / nguồn cộng đồng hằng ngày → thêm code mới → **push + Telegram + Discord** thông báo ngay.
- **Hạ tầng tái dùng:** đã có `cron`, `push-notify`, `telegram-notify`, `discord-notify`. Chi phí thêm rất thấp.

```sql
CREATE TABLE redeem_codes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT NOT NULL UNIQUE,
  reward      TEXT,                       -- phần thưởng
  region      TEXT DEFAULT 'VN',
  status      TEXT DEFAULT 'active',      -- active | expired
  expires_at  TIMESTAMPTZ,
  source_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);
```
**Effort:** Thấp–Trung bình · **Leverage:** Rất cao (SEO + push retention).

### 1.2. Tra cứu FF ID / Thống kê người chơi
> Nhập UID → nickname, level, rank, K/D, tỉ lệ thắng, lịch sử. Gắn vào hồ sơ + leaderboard.

- Trang `/tra-cuu` + widget trong `/u/[id]` và `/profile`.
- Cho phép người dùng **liên kết UID thật** → auto điền hồ sơ, trao huy hiệu, xếp hạng theo rank thật.
- Garena **không có API chính thức** → dùng dịch vụ bên thứ 3 (cần đánh giá độ ổn định & pháp lý) hoặc nhập tay + xác minh ảnh.
- Cache kết quả (Supabase + revalidate) để tránh rate limit.

**Effort:** Trung bình · **Leverage:** Cao (tương tác, gamification thật).

### 1.3. Tier List / Meta theo Patch
> Nhân vật, súng, pet xếp hạng S/A/B/C/D theo bản cập nhật.

- Nâng cấp `characters/vote` → **tier list biên tập (admin) + cộng đồng vote** song song.
- Gắn với `ff-version` → mỗi patch có 1 tier list riêng, so sánh biến động.
- Bộ lọc: theo chế độ (BR/CS), theo vai trò (rusher/support/sniper).

```sql
CREATE TABLE tier_lists (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind       TEXT NOT NULL,        -- character | weapon | pet
  patch      TEXT NOT NULL,        -- vd '1.108'
  mode       TEXT,                 -- br | cs | all
  published  BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE tier_list_entries (
  list_id  UUID REFERENCES tier_lists(id) ON DELETE CASCADE,
  ref_id   TEXT NOT NULL,          -- character/weapon/pet id
  tier     TEXT NOT NULL,          -- S | A | B | C | D
  note     TEXT
);
```
**Effort:** Trung bình · **Leverage:** Cao (SEO "tier list free fire", quay lại mỗi patch).

---

## 2. 🟡 ƯU TIÊN VỪA — Chiều sâu nội dung (SEO mạnh)

### 2.1. Kho dữ liệu chi tiết (Database thực sự)
Hiện `items` chỉ là icon. Cần database có **chỉ số + mô tả**:

- **Nhân vật:** kỹ năng chủ động/bị động, thời gian hồi, hình ảnh, độ hiếm, cách sở hữu.
- **Pet:** kỹ năng, cấp độ, ghép cặp nhân vật.
- **Súng:** damage, tầm bắn, tốc độ bắn, độ giật, magazine, phụ kiện tương thích.
- **Skin súng:** buff chỉ số (damage/range/…), hình ảnh.

```sql
CREATE TABLE ff_characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE, name TEXT, gender TEXT,
  skill_name TEXT, skill_type TEXT,     -- active | passive
  skill_desc TEXT, cooldown INT,
  rarity TEXT, image_url TEXT, released_at DATE
);
CREATE TABLE ff_weapons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE, name TEXT, category TEXT,  -- AR/SMG/SR/Shotgun...
  damage INT, range INT, rate_of_fire INT,
  reload INT, magazine INT, image_url TEXT
);
CREATE TABLE ff_pets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE, name TEXT,
  skill_name TEXT, skill_desc TEXT, image_url TEXT
);
```
Trang: `/nhan-vat`, `/nhan-vat/[slug]`, `/vu-khi`, `/thu-cung`. Nội dung này SEO cực tốt và giữ chân lâu.

**Effort:** Trung bình–Cao (chủ yếu là công nhập liệu) · **Leverage:** Cao.

### 2.2. Hướng dẫn & Sensitivity / Loadout
- **Sensitivity codes:** cấu hình độ nhạy theo thiết bị (điện thoại phổ biến), share & vote.
- **Loadout builder:** tổ hợp súng + skin + nhân vật + pet cho từng lối chơi.
- **Guides:** tips theo nhân vật/súng/chế độ, mẹo Booyah, drop location.
- Có thể tận dụng TipTap editor + hệ thống bài viết sẵn có, thêm taxonomy riêng.

**Effort:** Thấp–Trung bình · **Leverage:** Trung bình–Cao.

### 2.3. Patch Notes / Bản cập nhật
- Đã dò version qua cron → mở trang `/cap-nhat` ghi chú từng bản: nhân vật/súng mới, buff/nerf, sự kiện.
- Liên kết chéo với Tier List (mục 1.3) và Database (mục 2.1).

**Effort:** Thấp · **Leverage:** Trung bình.

### 2.4. Bản đồ tương tác (Interactive Maps)
- Bản đồ Bermuda / Purgatory / Kalahari: điểm loot, vị trí xe, drop tốt.
- Overlay chọn lớp, zoom, đánh dấu.

**Effort:** Trung bình · **Leverage:** Trung bình (nội dung khác biệt, ít đối thủ VN làm tốt).

---

## 3. 🟢 ESPORTS / GIẢI ĐẤU — Bổ trợ TMS đã có

### 3.1. Bracket Viewer + BXH trực tiếp
- TMS có `tms_matches` / `tms_match_results` nhưng thiếu **sơ đồ nhánh trực quan** + bảng điểm cập nhật realtime.
- Bảng điểm Booyah/placement (kill point + placement point), tính hạng tự động.
- Cân nhắc Supabase Realtime để cập nhật live.

**Effort:** Trung bình · **Leverage:** Cao cho mảng esports.

### 3.2. Tìm Scrim / Phòng Custom
- Ghép đối luyện tập, đăng tin tìm phòng custom, lịch scrim, mã phòng.
- Rất hợp cộng đồng thi đấu bán chuyên.

```sql
CREATE TABLE scrim_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID, mode TEXT, slots INT,
  scheduled_at TIMESTAMPTZ, room_code TEXT,
  status TEXT DEFAULT 'open', note TEXT,
  created_by UUID, created_at TIMESTAMPTZ DEFAULT now()
);
```
**Effort:** Trung bình · **Leverage:** Trung bình–Cao.

### 3.3. Clan / Bang hội
- Vượt ngoài `team` đơn lẻ: thành viên nhiều cấp, huy hiệu clan, BXH clan, phòng chat riêng, tuyển quân.
- Kết nối với gamification (điểm clan) và giải đấu.

**Effort:** Cao · **Leverage:** Cao (giữ chân dài hạn, mạng lưới xã hội).

### 3.4. Dự đoán & Cá cược ảo (Predictions)
- Người dùng dự đoán kết quả trận/giải bằng "điểm ảo", đổi huy hiệu/danh hiệu — không tiền thật.
- Tăng tương tác quanh mỗi giải đấu.

**Effort:** Trung bình · **Leverage:** Trung bình.

---

## 4. ⚪ MẢNG CỘNG ĐỒNG & TIỆN ÍCH

### 4.1. Creator / Streamer Hub
- Đã có `streams/sync` → thêm **hồ sơ streamer** (avatar, kênh, lịch live, trạng thái online).
- Trang `/streamer`, huy hiệu "Creator", ghim stream đang live lên trang chủ.

### 4.2. Đồng bộ lịch sự kiện Garena
- Kéo/nhập sự kiện in-game (Booyah Pass, sự kiện nạp, ưu đãi) vào `/lich`.
- Push nhắc trước khi sự kiện kết thúc.

### 4.3. Hướng dẫn nạp Kim cương / So giá
- Nội dung tiện ích: các mệnh giá, so giá kênh nạp, cảnh báo lừa đảo.
- Có thể gắn affiliate/đối tác nạp (nếu có).

### 4.4. Mini-games / Vòng quay (Engagement)
- Điểm danh chuỗi (đã có `checkin`) → mở rộng thành vòng quay may mắn đổi điểm/huy hiệu.
- Quiz kiến thức FF, đoán skin qua ảnh.

### 4.5. Marketplace / Trao đổi acc (thận trọng)
- Rao vặt acc/dịch vụ cày thuê — **rủi ro pháp lý & lừa đảo cao**, cần kiểm duyệt chặt hoặc bỏ qua.

---

## 5. 🛠️ NỀN TẢNG & VẬN HÀNH (không riêng FF nhưng nên có)

| Hạng mục | Mô tả | Ưu tiên |
|---|---|---|
| **SEO chuyên sâu** | Sitemap động, schema.org (Article, Event, VideoGame), OG image tự sinh cho tin/tier list | Cao |
| **PWA / thông báo** | Đã có push + Zalo mini app; cân nhắc PWA cài đặt trên màn hình chính | Trung bình |
| **Kiểm thử tự động** | Unit/e2e cho API quan trọng (redeem, TMS, auth) | Cao |
| **Giám sát lỗi** | Error tracking cho cron & tích hợp (Sentry-like) | Cao |
| **i18n** | Nếu nhắm SEA (EN) ngoài VN | Thấp |
| **Rate-limit tra cứu** | Cache + hàng đợi cho API bên thứ 3 (FF ID) | Cao (nếu làm 1.2) |
| **A/B & Analytics sâu** | Đã có Vercel Analytics; thêm event tracking cho tính năng mới | Trung bình |

---

## 6. LỘ TRÌNH ĐỀ XUẤT (3 giai đoạn)

**Giai đoạn 1 — Traffic nhanh (2–3 tuần)**
1. Mã đổi thưởng (1.1) + push tự động
2. Patch Notes (2.3)
3. Sensitivity/Guides tận dụng editor sẵn có (2.2)

**Giai đoạn 2 — Chiều sâu & giữ chân (1–2 tháng)**
4. Kho dữ liệu nhân vật/súng/pet (2.1)
5. Tier List theo patch (1.3)
6. Tra cứu FF ID (1.2)

**Giai đoạn 3 — Cộng đồng & esports (dài hạn)**
7. Bracket viewer + BXH live (3.1)
8. Scrim finder (3.2)
9. Clan/Bang hội (3.3)
10. Creator Hub (4.1)

---

## 7. GỢI Ý BẮT ĐẦU

**Đề xuất khởi động: Mã Đổi Thưởng (1.1)** — rẻ nhất, tái dùng gần hết hạ tầng (cron + push + Telegram/Discord + Supabase), cho kết quả traffic/retention thấy được ngay và làm bàn đạp cho các tính năng dữ liệu FF sau này.

*Báo cáo tạo ngày 10/07/2026 · Arex Network. Các schema SQL là gợi ý khung, cần rà RLS trước khi áp dụng.*
