# Chạy dự phòng trên Render khi Vercel sập

Bản chính vẫn ở Vercel. Render là bản đứng sẵn, cùng repo, cùng Supabase — chỉ
đổi chỗ chạy Next, không đổi dữ liệu.

## Dựng một lần (làm trước, đừng đợi lúc sập)

1. Render Dashboard → **New → Blueprint** → chọn repo này. Render đọc
   `render.yaml`, tạo web service `arex-web` (region Singapore, plan starter).
2. Dán các biến `sync: false` vào **Environment** của service. Lấy đúng giá trị
   đang chạy ở Vercel → Settings → Environment Variables.
   - `SHOP_SECRET_KEY` phải **y hệt** Vercel, đổi là mọi bản ghi bàn giao cũ
     hết giải mã được.
   - `CRON_SECRET` cũng phải khớp với secret cùng tên trên GitHub Actions.
3. Deploy. Kiểm tra `https://arex-web.onrender.com/api/health` trả
   `{"ok":true,"host":"render"}`.
4. Supabase → Authentication → URL Configuration: thêm domain Render vào
   **Redirect URLs**, nếu không thì đăng nhập trên bản dự phòng sẽ gãy.

Sau bước này `autoDeploy: true` giữ Render luôn bám theo `main`, lúc cần là có
sẵn bản mới nhất.

## Lúc Vercel sập

1. DNS của `arexnetwork.site` → trỏ về Render (Render → Settings → Custom
   Domains, làm theo bản ghi nó đưa). Cấp SSL tự động.
2. Bật cron dự phòng: GitHub → Settings → Secrets and variables → Actions →
   **Variables** → tạo `CRON_BASE_URL`.
   - DNS đã đổi xong: `https://arexnetwork.site`
   - DNS chưa kịp: `https://arex-web.onrender.com`
   Workflow `.github/workflows/cron-fallback.yml` chạy đúng lịch trong
   `vercel.json`. Không có biến này thì nó tự thoát, nên không sợ chạy trùng.
3. `shop-stale-orders.yml` (nhịp 3 giờ) gọi thẳng `arexnetwork.site` nên tự
   chạy tiếp khi DNS đã đổi — không phải sửa gì.

## Lúc Vercel sống lại

Trỏ DNS về Vercel, rồi **xoá biến `CRON_BASE_URL`** — quên bước này là cron
chạy hai lần mỗi ngày (một từ Vercel, một từ Actions).

## Những thứ khác đi khi chạy ở Render

| Thứ | Ở Vercel | Ở Render |
|---|---|---|
| Cron | `vercel.json` | GitHub Actions (`cron-fallback.yml`) |
| `x-vercel-ip-country` | có | không → `CookieConsent` nhận `country = null`, banner hiện cho mọi người |
| `waitUntil` (`lark-sheet.ts`) | giữ function sống ghi Lark | thành no-op, nhưng Node ở Render không bị kill giữa chừng nên tác vụ vẫn chạy hết |
| `@vercel/analytics`, `speed-insights` | có số liệu | im lặng, không lỗi |
| `x-vercel-cron` (shop-stale-orders) | nhận diện cron | không có → dựa hoàn toàn vào `CRON_SECRET` |
| Header/redirect trong `next.config.mjs` | chạy | vẫn chạy (Next tự xử lý, không phụ thuộc Vercel) |
| `headers` + `functions.maxDuration` trong `vercel.json` | chạy | bỏ qua — timeout do Render quyết, header tĩnh `_next/static` mất cache 1 năm |
