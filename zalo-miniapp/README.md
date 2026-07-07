# Arex — Zalo Mini App

Zalo Mini App (ZMP) cho cộng đồng Free Fire Arex. **Đăng nhập & dùng đầy đủ
ngay trong app** — không cần mở website. Dùng chung tài khoản với
`arexnetwork.site` (Supabase Auth): đăng nhập trên mini app = đăng nhập trên web.

## Tính năng

- ⚡ **Đăng nhập 1 chạm bằng Zalo** (native) + đăng nhập/đăng ký email
- 👤 **Tài khoản**: hồ sơ, điểm, Free Fire ID, **chỉnh sửa hồ sơ**, đăng xuất
- 🔔 **Thông báo** trong app (đánh dấu đã đọc, badge chưa đọc ở trang chủ)
- 💬 **Diễn đàn**: xem, đăng bài, bình luận (tích điểm như trên web)
- 📰 Tin tức · 📅 **Sự kiện (chi tiết trong app)** · 🏆 Giải đấu · 📊 Bảng xếp hạng
- 🔗 Mở web đầy đủ & nhóm cộng đồng Zalo

## Công nghệ

- [zmp-ui](https://mini.zalo.me) — UI + icon chính chủ của Zalo Mini App
- [zmp-sdk](https://mini.zalo.me) — SDK Zalo Mini App
- [@supabase/supabase-js](https://supabase.com) — Auth (phiên lưu ở localStorage,
  tự refresh token → đăng nhập 1 lần)
- React 18, routing qua `ZMPRouter`/`AnimationRoutes`, Vite + `zmp-vite-plugin`

## Kiến trúc đăng nhập

1. Mini app dùng `@supabase/supabase-js` gọi thẳng `signInWithPassword` → nhận
   `access_token` (JWT), lưu ở localStorage.
2. Mọi request tới API site đính kèm header `Authorization: Bearer <jwt>`
   (xem `src/api.ts` → `authFetch`).
3. Phía site, `createServerSupabaseClient()` đã được nâng cấp để nhận diện người
   dùng qua Bearer token (ngoài cookie). Nhờ vậy **toàn bộ API route sẵn có** đều
   hoạt động cho mini app mà không phải sửa từng route.
4. CORS cho `/api/*` được xử lý tập trung ở `middleware.ts` của site.

> Đăng ký gọi `POST /api/user/register` (auto-confirm email) để đồng bộ hồ sơ,
> thành tích… giống hệt web, rồi đăng nhập ngay.

### Đăng nhập 1 chạm bằng Zalo

1. Mini app gọi `getAccessToken()` (zmp-sdk) → access token Zalo.
2. `POST /api/zalo/miniapp/auth { accessToken }` — server xác thực token với
   `graph.zalo.me/v2.0/me`, lấy zalo user id → ánh xạ sang tài khoản Supabase
   tổng hợp `zalo_<id>@zalo.arexnetwork.site` (tạo mới nếu chưa có) → phát hành
   email OTP (magic link, **không gửi email**).
3. Mini app `supabase.auth.verifyOtp` để nhận session.

> **Env (site, Vercel):**
> - `ZALO_MINIAPP_APP_SECRET` = App Secret của Mini App (lấy ở mini.zalo.me — tài
>   khoản **cá nhân vẫn có**). Khuyến nghị đặt để ký `appsecret_proof`.
> - `SUPABASE_SERVICE_ROLE_KEY` (bắt buộc).
>
> **Gộp tài khoản theo SĐT** (khi login Zalo dùng chung tài khoản email sẵn có)
> **cần Zalo OA** (tài khoản doanh nghiệp) → hiện chưa bật. Không có OA thì login
> Zalo tạo/ dùng tài khoản riêng `zalo_<id>@…`. Backend đã sẵn sàng: khi có OA,
> set `ZALO_OA_ACCESS_TOKEN` và bật lại `getPhoneNumber()` ở `useAuth.tsx`.

## Cấu trúc

```
zalo-miniapp/src/
├── config.ts            # API_BASE, SUPABASE_URL, SUPABASE_ANON_KEY
├── api.ts               # getJson (công khai) + authFetch (Bearer) + forum/profile
├── lib/supabase.ts      # client Supabase + getAccessToken()
├── hooks/
│   ├── useAuth.tsx       # AuthProvider: session, profile, signIn/signUp/signOut
│   └── useAsync.ts
├── components/          # navbar, row, states
└── pages/               # home, news, events, event-detail, tournaments,
                         # leaderboard, forum, forum-post, login, account,
                         # edit-profile, notifications
```

## Chạy dev

```bash
cd zalo-miniapp
npm install
npm i -g zmp-cli      # nếu chưa có
zmp start             # mở Zalo Mini App Studio (giả lập)
```

## Deploy lên Zalo

- **App ID:** `4439670707467356054`

1. `zmp login` (đăng nhập tài khoản Zalo dev).
2. `zmp deploy` → chọn/nhập App ID `4439670707467356054`.
3. Trong Developer Console → **Cấu hình → Domain cho phép**, thêm **cả hai**:
   - `https://arexnetwork.site` (API site)
   - `https://ukelbkocjktbpjiogogl.supabase.co` (Supabase Auth)

   Thiếu domain nào thì request tới domain đó sẽ bị Zalo chặn.

## CORS

Site bật CORS cho toàn bộ `/api/*` (tập trung ở `middleware.ts`), cho phép header
`Authorization`. Không cần chỉnh gì thêm khi bổ sung màn hình mới gọi API khác.
