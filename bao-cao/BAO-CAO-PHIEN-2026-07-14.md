# Báo cáo phiên làm việc — 2026-07-13 → 2026-07-14

Tổng hợp toàn bộ công việc đã **hoàn thành** trong phiên (đã commit + push lên `main`).
Chủ đề chính: xây dựng gần như hoàn chỉnh 3 khu FF Wiki — **Vũ khí**, **Nhân vật**, **Thư viện Icon** — không đụng bảng xếp hạng người dùng hay tiền tệ.

---

## 1. Khu Vũ khí (`/vu-khi`)

- **Lọc / sort / tìm kiếm**: tìm theo tên (bỏ dấu), sort tên/sát thương/tầm bắn.
- **Thể loại + Phiên bản OB**: thêm cột `weapon_type` + `ob` cho `ff_weapons`, admin CRUD, chip lọc theo thể loại (AR/SMG/Sniper/…/Bom keo).
- **Trang thể loại** `/vu-khi/loai/[slug]` — URL riêng index được cho từng loại súng (10 loại, prerender).
- **So sánh 2 vũ khí** `/vu-khi/so-sanh` — đối chiếu chỉ số tức thì client-side.
- **Trang chi tiết**: thanh chỉ số (stat bar), vũ khí liên quan cùng loại, lịch sử tier (timeline + mũi tên xu hướng), phụ kiện gợi ý, JSON-LD `Product`.
- **Phụ kiện gợi ý**: cột `attachments` (JSONB) + admin quản lý slot/tên/ghi chú.
- **Combo / Loadout**: bảng `ff_loadouts`, admin CRUD `/admin/loadouts`, trang công khai `/vu-khi/loadout` + chi tiết `/vu-khi/loadout/[slug]`, lọc theo lối chơi, cross-link "Combo dùng khẩu này".
- **Khối "Meta hiện tại"** đầu trang: vũ khí tier S + combo đề xuất.
- **OG image động** cho súng + combo.

## 2. Khu Nhân vật (`/nhan-vat`)

Dựng mới hoàn toàn trên data tĩnh `FF_CHARACTERS` (37 nhân vật), không cần migration.

- **Danh sách**: tìm theo tên/kỹ năng, lọc **tier** (S–D) + **vai trò** (6 loại), card có badge tier + vai trò + loại kỹ năng (chủ động/bị động).
- **Trang chi tiết** `/nhan-vat/[slug]`: kỹ năng, nhân vật cùng vai trò, `generateStaticParams`, JSON-LD, breadcrumbs.
- **Trang vai trò** `/nhan-vat/vai-tro/[role]` (6 vai trò, prerender, canonical).
- **So sánh 2 nhân vật** `/nhan-vat/so-sanh` — đối chiếu tier/vai trò/loại kỹ năng/kỹ năng.
- **Khối "Meta hiện tại"** (tier S).
- **OG image động** cho từng nhân vật.
- **Điều hướng**: thêm "Nhân vật" trên navbar; tier list nhân vật (`/tier-list`) giờ có nút **"Xem trang chi tiết"** dẫn về `/nhan-vat/[slug]`.

## 3. Thư viện Icon (`/items`)

- **Lọc theo Phiên bản OB + cờ Hot / Mới ra**: thêm cột `ob` + `is_hot` cho `ff_items_catalog`, admin quản lý, badge Hot/OB trên lưới catalog + trang public + **trang chi tiết** `/items/[id]`.
- **Fix footgun bulk push**: khi push nhiều item từ Library vào catalog dùng `ignoreDuplicates` — chỉ thêm mới, **không ghi đè** label/category/is_public của item đã curate.

## 4. Tìm kiếm & SEO toàn site

- **Search tích hợp**: `/search` giờ tìm được cả **vũ khí**, **combo**, **nhân vật** (tab lọc + badge riêng).
- **Breadcrumbs + BreadcrumbList JSON-LD** xuyên suốt khu vũ khí (6 trang).
- **Sitemap**: bổ sung trang thể loại vũ khí, vai trò nhân vật, so sánh, combo, từng vũ khí/combo/nhân vật.

---

## Migration cần chạy khi deploy (Supabase — project `kjqqukageltvdohkakxb`)

| File | Nội dung |
|---|---|
| `supabase/migration-ff-weapons-type-ob.sql` | Thêm `weapon_type` + `ob` cho `ff_weapons` |
| `supabase/migration-ff-weapons-attachments-loadouts.sql` | Thêm `attachments` (JSONB) + bảng `ff_loadouts` (RLS) |
| `supabase/migration-ff-items-ob-hot.sql` | Thêm `ob` + `is_hot` cho `ff_items_catalog` |

> Chưa chạy migration thì tính năng tương ứng chưa hoạt động (form admin không lưu được, filter không hiện) — nhưng các trang public **degrade an toàn**, không crash.

---

## Danh sách commit (phiên này)

```
149ef28  feat(vu-khi): loc/sort, the loai + OB, so sanh, stat bar & vu khi lien quan
74b0515  feat(vu-khi): tier badge/loc, lich su tier, phu kien, combo/loadout
dc157cb  feat(vu-khi): trang the loai theo loai sung + loc combo theo loi choi
8a4001f  feat(search): tim kiem ca vu khi + combo trong /search
a389837  feat(vu-khi): breadcrumbs + BreadcrumbList JSON-LD toan bo khu vu khi
5233741  feat(vu-khi): khoi Meta hien tai + OG image dong cho sung/combo
e10706a  feat(nhan-vat): trang danh sach + chi tiet nhan vat Free Fire
06567ff  feat(nhan-vat): search tich hop + trang vai tro + Meta hien tai
96a8dbd  feat(items): loc theo OB + co Hot/Moi ra cho thu vien icon
bbf1e3f  feat(nhan-vat): OG image dong + so sanh 2 nhan vat
4572cde  feat(items): trang chi tiet /items/[id] hien OB + co Hot
f2dac89  feat(nhan-vat): tier list link toi trang chi tiet nhan vat
```

## Còn để bước sau

- **Admin CRUD nhân vật (DB)**: hiện `FF_CHARACTERS` là data tĩnh hardcode. Muốn sửa nhân vật qua admin thì cần migrate sang bảng `ff_characters` — vertical lớn, tách session riêng.

## Trạng thái

Tất cả đã push lên `main`, chờ Vercel deploy. **Nhớ chạy 3 migration Supabase** trước/ngay khi deploy.
