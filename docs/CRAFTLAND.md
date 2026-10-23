# Craftland Community Platform — Vận hành

Tài liệu cho đội vận hành ArexNetwork: triển khai, phân quyền, cách tính số liệu, sao lưu và rollback.

## 1. Thành phần

| Khu vực | Đường dẫn | Ghi chú |
|---|---|---|
| Trang Craftland | `/community/craftland` | Hero, tìm kiếm, nổi bật, quan tâm, đề xuất, creator, Academy, CTA |
| Thư viện bản đồ | `/community/craftland/maps` | Lọc thể loại/thời gian/nền tảng, 7 kiểu sắp xếp, lưới/danh sách, phân trang |
| Chi tiết bản đồ | `/community/craftland/maps/[slug]` | Mã map + sao chép, hướng dẫn, lưu, đánh giá, chia sẻ, báo cáo |
| Hồ sơ creator | `/community/craftland/creators/[username]` | Thống kê web, biểu đồ 90 ngày, theo dõi |
| Academy | `/community/craftland/academy` | Mục lục tự động, tìm toàn văn, tiến độ đọc, lưu bài |
| Creator Studio | `/creator` | Tổng quan, bản đồ, phân tích, CSV, hồ sơ, xác minh |
| Quản trị | `/admin/craftland` | Tổng quan, kiểm duyệt, báo cáo, thể loại |
| | `/admin/craftland/creators` | Hàng chờ xác minh, quản lý creator |
| | `/admin/craftland/academy` | Soạn bài Academy |

Code chính: `src/lib/server/craftland*.ts`, `src/components/craftland/`, `src/app/api/craftland/`, `src/app/api/admin/craftland/`.

## 2. Triển khai

1. **Sao lưu DB** (xem mục 6) trước khi chạy migration.
2. Chạy `supabase/migration-craftland.sql` trong Supabase SQL Editor (hoặc `/admin/sql`). File idempotent — chạy lại an toàn.
   Migration tạo bucket Storage `craftland` (public, 5MB, chỉ ảnh). Nếu project không cho tạo bucket bằng SQL, tạo tay trong Dashboard với cùng cấu hình.
3. Deploy code như bình thường (`npm run build`).
4. **Cấp quyền cho vai đã lưu ma trận**: nếu `/admin/permissions` đã từng được lưu, ma trận trong settings sẽ *không* tự có các capability `craftland.*` mới. Super Admin vào `/admin/permissions` tick:
   - Admin: `craftland.moderate`, `craftland.creators.manage`, `craftland.verify.review`, `craftland.content`, `craftland.analytics`
   - Manager: `craftland.moderate`, `craftland.verify.review`, `craftland.analytics`
   - Support (kiểm duyệt viên): `craftland.moderate`
   - `craftland.verify.decide` mặc định **chỉ Super Admin**. Chỉ cấp cho vai khác khi thật sự cần.
5. Kiểm tra nhanh: mở `/community/craftland`, tạo hồ sơ ở `/creator/profile`, tạo bản đồ, gửi duyệt, duyệt ở `/admin/craftland`.

### Biến môi trường

Không có biến mới. Dùng lại:

| Biến | Dùng cho |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Đăng nhập; host Storage là nguồn ảnh hợp lệ duy nhất (cùng `ik.imagekit.io`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Mọi đọc/ghi Craftland ở server |
| `APP_SECRET` | Muối băm mã khách ẩn danh. **Đổi APP_SECRET làm số "khách ước tính" của ngày đó bị đếm lại** — không mất dữ liệu cũ |

## 3. Phân quyền

| Vai trò | Cách có | Quyền |
|---|---|---|
| Guest | Không đăng nhập | Xem nội dung công khai |
| Member | Đăng nhập | Lưu, đánh giá, báo cáo, theo dõi, tiến độ Academy |
| Creator | Có dòng trong `craftland_creators` (tự tạo ở `/creator/profile`) | Quản lý hồ sơ + bản đồ của chính mình, xem số liệu của chính mình |
| Moderator | Vai có `craftland.moderate` | Duyệt/từ chối/ẩn/khôi phục/gỡ bản đồ, xử lý báo cáo, xác nhận nền tảng |
| Admin | Vai có `craftland.creators.manage`, `craftland.verify.review`, `craftland.content` | + quyền đăng, khoá creator, kiểm tra hồ sơ xác minh, thể loại, đề xuất, Academy |
| Super Admin | `super_admin` | Toàn quyền, gồm `craftland.verify.decide` (cấp/từ chối/thu hồi huy hiệu) |

Mọi kiểm tra quyền chạy ở server: middleware chặn `/admin/craftland/*` theo `src/lib/constants/admin-routes.ts`, từng page gọi `requireAdminCapability`, từng API gọi `requireStaff(capability)`. Creator chỉ truy vấn bản đồ theo `creator_id = user hiện tại` — id của người khác trả 404 (không lộ sự tồn tại). Admin không tự nâng vai được vì đổi vai vẫn đi qua `/admin/users` hiện có.

**Thao tác nhạy cảm** (gỡ/huỷ gỡ bản đồ, khoá/mở khoá creator, thu hồi xác minh, phê duyệt/từ chối xác minh): bắt nhập lý do + gõ `XAC NHAN`; tài khoản đã bật MFA phải có phiên AAL2 (`requireMfaIfEnrolled`). Khuyến nghị bật TOTP cho mọi tài khoản quản trị ở `/admin/profile`.

Không có endpoint xoá cứng bản đồ, creator hay bài Academy: dùng trạng thái `removed` / `suspended` / `archived`. Bản đồ `removed` khôi phục được bằng "Huỷ gỡ" (về `hidden`).

## 4. Máy trạng thái bản đồ

```
draft ──submit──▶ pending ──approve──▶ published ──hide──▶ hidden ──restore──▶ published
  ▲                  │                    │
  │               reject                  └─(creator đổi tên/mã map)─▶ pending
  │                  ▼
  └──(sửa)──── rejected
bất kỳ ──remove──▶ removed ──unremove──▶ hidden
draft|rejected|pending|published ──archive (creator)──▶ archived ──restore──▶ draft
```

Gửi duyệt yêu cầu: mã map, ảnh cover, mô tả ngắn ≥ 10 ký tự. Khoá creator sẽ ẩn các bản đồ đang xuất bản (ghi chú `[auto] Creator bị khoá`); mở khoá trả lại đúng những bản đồ đó.

## 5. Số liệu — cách tính

Tất cả là số liệu **trên website ArexNetwork**, không phải lượt chơi trong Free Fire.

- **Lượt xem**: trang chi tiết gửi một sự kiện `view` khi tải. Server (`/api/craftland/maps/[id]/event`) loại:
  - User-agent bot/trình thu thập/thư viện HTTP, hoặc UA quá ngắn → `bot`
  - Thiếu header `Origin` hoặc khác host → `cross_origin`
  - Quá 40 sự kiện/phút/IP → `rate`
  - Hàm `craftland_record_event` (Postgres) loại tiếp: cùng khách + cùng loại trong khung 30 phút → `duplicate`; chủ bản đồ → `owner`; bản đồ chưa xuất bản → `not_published`.
  Lý do loại đếm theo ngày ở `craftland_event_rejections`, xem tại tab Tổng quan.
- **Khách ước tính**: mã băm SHA-256(IP | UA | ngày | APP_SECRET), không lưu IP. Đếm "khách khác nhau trong ngày", cộng dồn qua các ngày.
- **Chuyển đổi** = (sao chép mã + mở hướng dẫn) / lượt xem.
- **Nguồn**: từ `document.referrer` + `?src=share` của link chia sẻ. Trang ngoài chỉ giữ host.
- **Khu vực**: header `x-vercel-ip-country` / `cf-ipcountry` nếu hạ tầng cung cấp; trên Netlify hiện trống.
- Thời gian tương tác và tỷ lệ thoát **chưa đo** nên không hiển thị.

Client không bao giờ gửi được số tổng hợp: chỉ gửi loại sự kiện; hàm ghi bị `REVOKE` khỏi `anon`/`authenticated` nên không gọi trực tiếp qua RPC được.

### Hạn lưu dữ liệu

Sự kiện thô (`craftland_map_events`) giữ mặc định 180 ngày; bảng ngày (`craftland_map_daily`) giữ vĩnh viễn nên biểu đồ không mất. Dọn định kỳ:

```sql
select public.craftland_purge_events(180);
```

Chạy hằng tuần (Supabase `pg_cron` hoặc thủ công qua `/admin/sql`). Dưới 30 ngày bị chặn.

## 6. Sao lưu & khôi phục

**Trước khi migration / thao tác hàng loạt:**

```bash
pg_dump "$DATABASE_URL" --format=custom --file=arex-$(date +%F).dump \
  --table='public.craftland_*' --table=public.users --table=public.settings
```

(Supabase Pro có PITR / backup hằng ngày — kiểm tra trong Dashboard → Database → Backups.)

**Khôi phục một bảng Craftland:**

```bash
pg_restore --dbname="$DATABASE_URL" --data-only --table=craftland_maps arex-YYYY-MM-DD.dump
```

`craftland_moderation_actions` có trigger chặn UPDATE/DELETE; khôi phục chỉ nên dùng `--data-only` vào bảng rỗng (hoặc tạm `ALTER TABLE ... DISABLE TRIGGER trg_craftland_mod_append_only` bởi chủ DB, rồi bật lại ngay).

Ảnh nằm ở Storage bucket `craftland` — sao lưu bằng Supabase CLI (`supabase storage cp -r ss:///craftland ./backup`) hoặc script tương đương.

## 7. Rollback

1. **Code**: revert commit / redeploy bản trước. Các bảng Craftland thừa không ảnh hưởng phần còn lại của site.
2. **Tắt tạm tính năng**: khoá `/community/craftland` và `/creator` ở `/admin/feature-locks` (chuyển hướng về `/updating`).
3. **Gỡ hẳn schema** (chỉ khi chắc chắn, sau khi đã `pg_dump`):

```sql
drop table if exists public.craftland_academy_progress, public.craftland_academy_articles,
  public.craftland_academy_categories, public.craftland_moderation_actions, public.craftland_follows,
  public.craftland_reports, public.craftland_ratings, public.craftland_favorites,
  public.craftland_event_rejections, public.craftland_map_daily, public.craftland_map_events,
  public.craftland_map_versions, public.craftland_maps, public.craftland_categories,
  public.craftland_verification_requests, public.craftland_creators cascade;
drop function if exists public.craftland_record_event, public.craftland_view_breakdown,
  public.craftland_purge_events, public.craftland_bump_rejection, public.craftland_vn_today,
  public.craftland_favorites_count, public.craftland_ratings_count, public.craftland_reports_count,
  public.craftland_follows_count, public.craftland_maps_touch, public.craftland_touch_updated_at,
  public.craftland_block_audit_mutation cascade;
```

## 8. Academy — nguyên tắc nội dung

- Viết lời giải thích và ví dụ riêng của ArexNetwork; **không** dán nguyên văn tài liệu, mã nguồn hay hình ảnh có bản quyền của Garena.
- Mỗi bài dẫn link nguồn tài liệu chính thức (trình soạn cảnh báo khi xuất bản bài không có nguồn).
- "Cảnh báo tương thích" chỉ ghi khi có căn cứ từ tài liệu chính thức.
- HTML được sanitize ở server (`sanitizeRichText`) trước khi lưu.

### Tra cứu API (`/community/craftland/academy/api`)

Dữ liệu ở `src/lib/data/craftland-api-index.json`, sinh bởi:

```bash
node scripts/sync-craftland-docs.mjs   # ~15 phút, tuần tự 400ms/request
```

Script chỉ lấy tên, chữ ký khai báo, tên + kiểu tham số và cờ hết hạn — không lấy mô tả/ví dụ của Garena. Chạy lại khi Garena có bản cập nhật Craftland, rồi deploy.

### Bài hướng dẫn mẫu

```bash
node scripts/seed-craftland-academy.mjs          # đăng / cập nhật (upsert theo slug)
node scripts/seed-craftland-academy.mjs --draft  # lưu nháp
```

Script từ chối ghi nếu bài nhắc tới tên hàm/sự kiện không có trong chỉ mục. Số liệu trong bài (số API, số mục hết hạn) lấy thẳng từ chỉ mục, nên chạy lại sau khi đồng bộ để cập nhật. Sửa bài trên `/admin/craftland/academy` sẽ bị ghi đè nếu chạy lại script — sau khi đã chỉnh tay, đừng chạy lại cho bài đó.

## 9. Kiểm thử đã chạy

- `npm run typecheck`, `npx eslint` trên toàn bộ file mới/sửa, `next build`.
- Migration chạy 2 lần trên PostgreSQL 18 sạch (idempotent) + kiểm thử hành vi: chống trùng 30 phút, loại chủ map / map nháp / loại sự kiện sai, trigger đếm (lưu, đánh giá, theo dõi), `updated_at` không nhảy khi chỉ đổi bộ đếm, ràng buộc dữ liệu, bảng nhật ký append-only, RLS cho `anon`, và `anon` không gọi được hàm ghi sự kiện.

### Việc còn lại / chưa làm

- **Bình luận bản đồ**: chưa bật — cần quy trình kiểm duyệt bình luận riêng trước khi mở (yêu cầu gốc: "nếu đã có hệ thống kiểm duyệt phù hợp").
- **Thông báo** (creator được duyệt/từ chối, có follower mới): chưa nối vào `notifications` hiện có.
- **Thời gian tương tác / tỷ lệ thoát**: chưa đo.
- Bộ đếm rate limit là in-memory theo instance (giống phần còn lại của site); chống flood thật nên đặt ở biên (Cloudflare / Vercel Firewall).
- Sắp xếp "Được quan tâm" xếp hạng trên tối đa 1.000 bản đồ khớp bộ lọc; khi thư viện lớn hơn nên chuyển điểm 7 ngày thành cột cập nhật định kỳ.
- Chưa có test tự động (dự án hiện không có test runner); khuyến nghị thêm Playwright cho luồng creator → kiểm duyệt.
