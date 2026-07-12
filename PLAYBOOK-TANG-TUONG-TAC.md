# PLAYBOOK TĂNG TƯƠNG TÁC NGƯỜI DÙNG — AREX

**Mục tiêu:** Biến các tính năng rời rạc thành **vòng lặp kéo người dùng quay lại & tương tác mỗi ngày**.
**Dự án:** Arex Network (Free Fire) · Next.js 15 · Supabase · **Ngày:** 10/07/2026

---

## 0. Chẩn đoán — Tại sao tương tác chưa cao?

Arex **không thiếu tính năng**, mà thiếu **chất keo** nối chúng thành thói quen. Các mảnh đang nằm rời:

| Đã có (nguyên liệu) | Vấn đề hiện tại |
|---|---|
| Điểm danh (`checkin`) | Điểm danh xong… hết. Không có chuỗi, không phần thưởng leo thang |
| Huy hiệu, danh hiệu, khung avatar | Nhận rồi để đó, ít lý do khoe / cạnh tranh |
| Điểm đóng góp (`contributor_points`) | Không ai thấy mình đang ở đâu, không có mùa (season) |
| Forum, poll, weekly-vote | Đăng xong không ai được nhắc → hội thoại chết |
| Follow user (`user_user_follows`), feed | Follow nhưng không nhận thông báo hoạt động |
| Push / Telegram / Zalo | Chỉ bắn tin bài mới, **không kéo user quay lại đúng lúc** |

> **Nguyên tắc vàng:** Tương tác cao = **(Lý do quay lại mỗi ngày) × (Việc để làm khi vào) × (Được ghi nhận) × (Được nhắc đúng lúc)**. Arex mạnh vế 2, yếu 3 vế còn lại.

---

## 1. VÒNG LẶP TƯƠNG TÁC (Engagement Loops)

Thiết kế 3 nhịp: **Ngày → Tuần → Mùa**. Mỗi nhịp có "lý do vào", "việc làm", "phần thưởng", "cú nhắc".

### 🔁 Nhịp NGÀY (habit — quan trọng nhất)
```
Push sáng ("Điểm danh + nhiệm vụ hôm nay") 
   → Vào app → Điểm danh (chuỗi) 
   → Làm 3 nhiệm vụ ngày (đọc 1 bài / vote / bình luận) 
   → Nhận XP + điểm 
   → Thấy tiến độ tăng → hôm sau quay lại giữ chuỗi
```
Cần: **chuỗi điểm danh có thưởng leo thang** + **nhiệm vụ hằng ngày** (mục 2.1, 2.2).

### 🔁 Nhịp TUẦN (competition)
```
Thứ 2 mở "BXH tuần" + chủ đề bình chọn tuần 
   → user đua điểm, vote, thi ảnh/clip 
   → Chủ nhật chốt → trao danh hiệu tuần + ghim lên trang chủ
```
Cần: **BXH có reset tuần**, **thử thách tuần** (mục 2.3, 2.4).

### 🔁 Nhịp MÙA (status dài hạn)
```
Mỗi patch/tháng = 1 mùa 
   → tích điểm mùa, mở khóa khung avatar/danh hiệu giới hạn 
   → hết mùa reset BXH, giữ "huy hiệu mùa" làm kỷ niệm
```
Cần: **hệ thống mùa (season)** gắn với `contributor_points` + `ff-version`.

---

## 2. CƠ CHẾ CỤ THỂ (xếp theo tác động tương tác)

### 2.1. Chuỗi điểm danh có thưởng leo thang ⭐ LÀM ĐẦU TIÊN
> Đây là "cú hích" rẻ nhất để tạo thói quen quay lại hằng ngày.

- Điểm danh 7 ngày liên tục = phần thưởng tăng dần (XP, điểm, mảnh ghép khung avatar).
- Mất chuỗi = reset → tạo áp lực tích cực "đừng bỏ lỡ".
- Hiển thị lịch chuỗi + "còn X ngày đến mốc thưởng lớn".
- **Tái dùng:** đã có `checkin` → chỉ thêm cột streak + bảng phần thưởng.

```sql
ALTER TABLE user_checkins ADD COLUMN streak INT DEFAULT 0;
ALTER TABLE user_checkins ADD COLUMN best_streak INT DEFAULT 0;
-- reward theo mốc: 3/7/14/30 ngày
```
**Tác động:** ⭐⭐⭐⭐⭐ DAU / retention D1-D7 · **Effort:** Thấp.

### 2.2. Nhiệm vụ hằng ngày / hằng tuần (Daily Quests)
> Cho user "việc để làm" mỗi khi vào — biến hành vi có sẵn thành mục tiêu có thưởng.

Ví dụ nhiệm vụ ngày (chọn ngẫu nhiên 3):
- Đọc 1 bài tin · Bình luận 1 lần · Vote 1 poll · Reaction 1 bài · Ghé forum.

Nhiệm vụ tuần: đăng 1 bài forum, mời 1 bạn, tham gia 1 sự kiện.

```sql
CREATE TABLE quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT, title TEXT, kind TEXT,      -- daily | weekly
  action TEXT, target INT, reward_xp INT, reward_points INT
);
CREATE TABLE user_quest_progress (
  user_id UUID, quest_id UUID, progress INT DEFAULT 0,
  completed_at TIMESTAMPTZ, period_key TEXT,  -- '2026-07-10' | '2026-W28'
  PRIMARY KEY (user_id, quest_id, period_key)
);
```
> Mẹo: gắn tăng progress **fire-and-forget** ngay trong các API sẵn có (comment, vote, favorite) — giống cách award-achievement đang làm.

**Tác động:** ⭐⭐⭐⭐⭐ số hành động/user · **Effort:** Trung bình.

### 2.3. Hệ thống XP / Level thống nhất (CHẤT KEO)
> Vấn đề lớn nhất: điểm/huy hiệu/đóng góp đang rời rạc. Gộp về **1 thanh tiến trình** mà user luôn thấy.

- Mọi hành động (đọc, bình luận, vote, đăng bài, điểm danh, thắng nhiệm vụ) → cộng **XP**.
- XP → **Level** → mở khóa danh hiệu / khung avatar / quyền (vd: đủ level mới được đăng forum).
- Hiển thị thanh XP ở navbar + hồ sơ → cảm giác "chỉ còn chút nữa lên cấp" (Zeigarnik effect).
- **Tái dùng:** gộp `contributor_points`, achievements, titles về một trục.

```sql
ALTER TABLE profiles ADD COLUMN xp INT DEFAULT 0;
ALTER TABLE profiles ADD COLUMN level INT DEFAULT 1;
CREATE TABLE xp_logs (
  user_id UUID, amount INT, reason TEXT, created_at TIMESTAMPTZ DEFAULT now()
);
```
**Tác động:** ⭐⭐⭐⭐⭐ (nền cho mọi cơ chế khác) · **Effort:** Trung bình.

### 2.4. BXH theo mùa + reset (Seasons & Leaderboard)
> BXH tĩnh thì chỉ top đầu quan tâm. BXH **reset theo tuần/mùa** cho ai cũng có cơ hội.

- BXH tuần / tháng / mùa (theo XP kiếm trong kỳ, không phải tổng).
- Top tuần → danh hiệu tạm + ghim trang chủ; top mùa → khung avatar giới hạn.
- Thêm **BXH bạn bè** (chỉ người mình follow) → cạnh tranh gần gũi, dễ vượt hơn.

**Tác động:** ⭐⭐⭐⭐ quay lại cuối tuần · **Effort:** Trung bình.

### 2.5. Thông báo hoạt động xã hội (Social Notifications) ⭐
> Lý do quay lại mạnh nhất của mạng xã hội: "có người tương tác với MÌNH".

Bắn thông báo (in-app + push) khi:
- Bình luận/bài của mình được **reply / reaction / vote**.
- Người mình **follow** đăng bài mới / lên top.
- Được **mention** (@tên) trong forum/bình luận.
- Huy hiệu/level mới, thắng nhiệm vụ.

> **Tái dùng:** đã có `notifications`, `push-notify`, `user_user_follows`. Chỉ cần thêm **trigger** tại các API tương tác. Đây là đòn bẩy cao nhất mà chi phí thấp.

**Tác động:** ⭐⭐⭐⭐⭐ retention · **Effort:** Thấp–Trung bình.

### 2.6. Nội dung do user tạo (UGC) + thi đua
> User tương tác nhiều nhất khi họ được **tạo và được công nhận**.

- **Cuộc thi ảnh/clip Booyah tuần** — đăng, cộng đồng vote (dùng `weekly_post_votes`), thắng nhận danh hiệu.
- **Chia sẻ loadout / sensitivity** — user đăng cấu hình, người khác vote & lưu.
- **Bình chọn "Bài viết của tuần"**, "Thành viên tích cực nhất".
- Ghim UGC nổi bật lên trang chủ → tạo động lực đóng góp.

**Tác động:** ⭐⭐⭐⭐ chiều sâu + nội dung tự sinh · **Effort:** Trung bình.

### 2.7. Cơ chế "sợ bỏ lỡ" (FOMO / Time-limited)
- **Sự kiện giới hạn giờ:** flash quiz, vòng quay may mắn mở 2 tiếng.
- **Phần thưởng hết hạn:** "nhận trong hôm nay".
- **Đếm ngược** trên trang chủ (đã có countdown ở hero banner → tái dùng).
- Mã đổi thưởng theo ngày (nếu làm) cũng là FOMO tự nhiên.

**Tác động:** ⭐⭐⭐⭐ đột biến DAU quanh sự kiện · **Effort:** Thấp–Trung bình.

### 2.8. Onboarding có thưởng (kích hoạt người mới)
> Nhiều user rời đi trong 5 phút đầu vì không biết làm gì.

- Checklist người mới: hoàn thiện hồ sơ, liên kết FF ID, follow 3 chủ đề, đăng bình luận đầu → mỗi bước 1 huy hiệu + XP.
- **Tái dùng:** đã có achievements `newcomer`, `profile_complete` → gói thành 1 luồng onboarding rõ ràng có tiến độ.

**Tác động:** ⭐⭐⭐⭐ retention D1 · **Effort:** Thấp.

---

## 3. NHỊP THÔNG BÁO KÉO NGƯỜI DÙNG QUAY LẠI (Retention Cadence)

> Bạn đã có push + Telegram + Zalo nhưng chỉ dùng để báo tin bài. Đây là mỏ vàng chưa khai thác.

| Thời điểm | Nội dung | Mục tiêu |
|---|---|---|
| Sáng (8h) | "Điểm danh + 3 nhiệm vụ hôm nay đã sẵn sàng" | Mở nhịp ngày |
| Trưa/tối | "Có người trả lời bình luận của bạn" / "X vừa đăng bài" | Social pull |
| Sắp mất chuỗi | "Còn 3 tiếng để giữ chuỗi 6 ngày!" | Chống rơi rớt |
| Cuối tuần | "BXH tuần sắp chốt — bạn đang hạng 8, cố lên top 5!" | Đua cuối tuần |
| Sự kiện | "Flash quiz mở trong 2 tiếng — thưởng x2" | FOMO |

> Nguyên tắc: **cá nhân hóa + đúng lúc + có ích**. Tránh spam đồng loạt → cho user chỉnh loại thông báo (đã có hạ tầng settings).

**Tác động:** ⭐⭐⭐⭐⭐ · **Effort:** Trung bình (chủ yếu là logic trigger + cron).

---

## 4. ĐO LƯỜNG (để biết có hiệu quả)

Thêm dashboard admin theo dõi (đã có `analytics`, `stats`):

| Chỉ số | Ý nghĩa | Mục tiêu tham khảo |
|---|---|---|
| **DAU / WAU / MAU** | Người dùng hoạt động ngày/tuần/tháng | Theo dõi xu hướng tăng |
| **Stickiness (DAU/MAU)** | Độ "dính" | > 20% là tốt |
| **Retention D1 / D7 / D30** | % quay lại sau 1/7/30 ngày | D1 > 30%, D7 > 15% |
| **Hành động/user/ngày** | Bình luận + vote + reaction… | Tăng đều |
| **Tỉ lệ hoàn thành nhiệm vụ** | % user làm quest ngày | > 40% |
| **Chuỗi điểm danh trung bình** | Độ bền thói quen | Tăng dần |

> Đo trước–sau mỗi khi ra cơ chế mới để biết cái nào thực sự hiệu quả.

---

## 5. LỘ TRÌNH ĐỀ XUẤT (tác động cao, chi phí thấp trước)

**Đợt 1 — Vòng lặp ngày & social pull (1–2 tuần) — ROI cao nhất**
1. Chuỗi điểm danh có thưởng (2.1)
2. Thông báo hoạt động xã hội (2.5) ← *đòn bẩy mạnh nhất, rẻ nhất*
3. Onboarding có thưởng (2.8)

**Đợt 2 — Chất keo & nhiệm vụ (2–4 tuần)**
4. Hệ thống XP/Level thống nhất (2.3)
5. Nhiệm vụ hằng ngày/tuần (2.2)
6. Nhịp thông báo retention (§3)

**Đợt 3 — Cạnh tranh & UGC (dài hạn)**
7. BXH theo mùa + reset (2.4)
8. Thi đua UGC (2.6)
9. Sự kiện FOMO / flash (2.7)
10. Dashboard đo lường (§4)

---

## 6. GỢI Ý BẮT ĐẦU

**Đề xuất khởi động: (2.5) Thông báo hoạt động xã hội + (2.1) Chuỗi điểm danh.**
Cả hai **tái dùng gần như 100% hạ tầng sẵn có** (`notifications`, `push`, `checkin`, `follows`), chi phí thấp nhất nhưng tác động trực tiếp đến "lý do quay lại" và "cảm giác được ghi nhận" — hai vế Arex đang yếu nhất. Làm xong sẽ thấy DAU/retention nhích ngay, rồi mới đầu tư XP/Level làm nền cho phần còn lại.

*Playbook tạo ngày 10/07/2026 · Arex Network. Schema SQL là gợi ý khung — rà RLS trước khi áp dụng. Nên đo DAU/retention trước–sau mỗi cơ chế.*
