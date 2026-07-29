# Arex Hub — app quản trị native (iOS / Android)

App di động để **quản lý web và app Arex Network**: xem số liệu, đăng tin tức /
sự kiện / ảnh, kiểm duyệt bình luận và diễn đàn, quản lý người dùng, gửi thông
báo hệ thống, tải bản phát hành app.

> **Không phải WebView.** Khác với `mobile/` (Arex Network — vỏ WebView nạp
> `arexnetwork.site`), Arex Hub là app đóng gói sẵn: toàn bộ giao diện là bundle
> React nằm trong app, chỉ gọi REST API ra ngoài. Giao diện thiết kế riêng cho
> điện thoại, không dùng lại UI của trang `/admin`.

| | `mobile/` (Arex Network) | `mobile-hub/` (Arex Hub) |
|---|---|---|
| Đối tượng | Người dùng cộng đồng | Quản trị viên |
| App ID | `site.arexnetwork.app` | `site.arexnetwork.hub` |
| Giao diện | WebView nạp website | Bundle React đóng gói trong app |
| Mất mạng | Trang lỗi tĩnh | Khung app vẫn chạy, dữ liệu dùng bản đã tải |
| Đăng nhập | Phiên cookie của web | Supabase email/mật khẩu → Bearer token |

---

## Kiến trúc

```
Arex Hub (WebView nội bộ, origin capacitor://localhost | http://localhost)
   │
   ├─ @supabase/supabase-js  → đăng nhập, giữ phiên trong Capacitor Preferences
   │                           (bền hơn localStorage, không bị OS dọn)
   │
   └─ fetch → https://arexnetwork.site/api/*
              Authorization: Bearer <supabase access token>
```

Phía server không cần sửa gì để nhận request này:

- `src/lib/supabase/server.ts` đã đọc header `Authorization: Bearer` và chạy đúng
  danh tính người gọi (cơ chế vốn làm cho Zalo/Telegram Mini App).
- CORS cho `/api/*` đã mở sẵn ở `next.config.mjs` (không phụ thuộc middleware).
- Endpoint duy nhất được thêm cho Hub: `GET /api/admin/app-releases` (liệt kê file
  cài đặt — trước đó chỉ có route `download`).

Chỉ vai trò **Support trở lên** vào được Hub; mỗi API vẫn tự kiểm tra quyền của
nó nên app không thể vượt rào bằng cách gọi thẳng.

---

## Chạy thử trên máy

```bash
cd mobile-hub
npm install
cp .env.example .env      # sửa VITE_API_BASE_URL nếu cần
npm run dev               # http://localhost:5180
```

Muốn trỏ vào `next dev` chạy trên máy: đặt `VITE_API_BASE_URL=http://<ip-lan>:3000`
trong `.env` (dùng IP LAN, không dùng `localhost` — điện thoại hiểu `localhost` là chính nó).

## Build & chạy trên thiết bị

```bash
npm run sync              # build bundle + cap sync (chạy lại sau MỖI lần sửa code)

npm run open:android      # mở Android Studio (hướng dẫn đầy đủ: ANDROID-STUDIO.md)
npm run open:ios          # mở Xcode (chỉ trên macOS)

npm run run:android       # cài thẳng vào máy/emulator đang cắm
npm run build:android:debug     # → android/app/build/outputs/apk/debug/
npm run build:android:release   # → AAB để nộp Play Store (cần cấu hình ký)
```

Đổi icon / splash:

```bash
npm run assets            # sinh lại từ resources/ rồi đổ ra iOS + Android
```

Mặc định icon là khối gradient tím → lơ chữ "AX" (cố ý khác icon Arex Network để
hai app không lẫn nhau trên màn hình chính). Muốn dùng logo riêng: đặt file PNG
vuông vào `resources/logo-source.png` rồi chạy lại lệnh trên.

---

## Cập nhật nóng (OTA)

Sửa giao diện xong **không phải gỡ app cài lại** — nhất là trên iOS, nơi chứng
chỉ Apple ID miễn phí chỉ sống 7 ngày và phải cắm máy ký lại bằng Sideloadly.

```bash
cd mobile-hub && npm run build && cd ..
node scripts/upload-hub-bundle.mjs --version 1.0.1 --notes "Sửa lỗi đăng nhập"
```

Người dùng mở app → **Hệ thống → Cập nhật app** → thấy chip “Có bản mới” → bấm
**Cập nhật ngay**. App tải zip về, thay ruột rồi tự khởi động lại.

| | Cập nhật nóng | Cài lại app |
|---|---|---|
| Đổi được | JS / CSS / ảnh trong bundle | mọi thứ |
| **Không** đổi được | plugin native, quyền, icon, `Info.plist`, `appId` | — |
| iOS | không cần ký lại | phải ký lại (7 ngày) |

Cách chạy:

- Bundle nằm ở bucket `app-releases`, nhánh `bundle/<version>/bundle.zip` —
  `listAppReleases()` chỉ quét `android/` + `ios/` nên hai bên không đụng nhau.
- App hỏi `GET /api/hub/bundle/latest?current=<đang chạy>`; server so phiên bản
  theo số (`1.2.10 > 1.2.9`, so chuỗi thì sai) rồi trả **signed URL sống 30 phút**
  — plugin tải bằng HTTP thuần, không gắn được `Authorization`.
- `src/lib/updater.ts` bọc `@capgo/capacitor-updater`: `download()` rồi `set()`.
  Sau `set()` WebView khởi động lại ngay, đừng viết logic nào phía sau.
- `bootNativeChrome()` gọi `notifyAppReady()`. **Đây là lưới an toàn**: bundle mới
  làm app chết trước khi kịp báo ready thì lần mở sau plugin tự quay về bản cũ.
- `resetWhenUpdate: true` — cài đè bản native mới thì quay về bundle gốc, tránh
  bundle OTA cũ đè lên app mới.

> Lần đầu tiên vẫn phải dựng lại và cài lại app một lần, vì bản thân plugin cập
> nhật là code native. Từ lần đó trở đi mới OTA được.

---

## Cấu trúc mã

```
src/
  env.ts                    cấu hình build (API base, Supabase)
  types.ts                  kiểu dữ liệu khớp response API
  lib/
    supabase.ts             client + lưu phiên bằng Capacitor Preferences
    api.ts                  fetch kèm Bearer, upload ảnh, ký link tải app
    queries.ts              toàn bộ hook React Query (một chỗ duy nhất gọi API)
    native.ts               haptics, status bar, splash, mạng, back button, push
    format.ts               ngày giờ, số, slug, HTML ↔ chữ thuần
  auth/auth-context.tsx     phiên đăng nhập + vai trò + chặn tài khoản thiếu quyền
  components/               UI kit (nút, thẻ, bottom sheet, toast, chart, picker ảnh)
  screens/
    login.tsx               đăng nhập
    dashboard.tsx           số liệu + biểu đồ 30 ngày + lối tắt + hoạt động gần đây
    compose.tsx             ĐĂNG: tin tức / sự kiện / thư viện ảnh
    content.tsx             danh sách + sửa + xoá nội dung đã đăng
    moderation.tsx          duyệt bình luận, xử lý bài diễn đàn
    system.tsx              menu Hệ thống
    system-users.tsx        khoá tài khoản, đổi vai trò, tích xanh
    system-broadcast.tsx    thông báo hệ thống toàn site
    system-releases.tsx     tải file cài đặt app
    system-logs.tsx         nhật ký hoạt động
```

Thêm màn hình mới: viết file trong `screens/`, khai báo route trong `src/App.tsx`,
và **chỉ gọi API qua `lib/queries.ts`** để cache/invalidate nhất quán.

---

## Chức năng theo màn hình

**Đăng nội dung** (nút + ở giữa thanh dưới)
- Tin tức: tiêu đề, slug tự sinh, danh mục (lấy từ settings `news.categories`),
  ảnh bìa, tóm tắt, nội dung; lưu nháp hoặc đăng ngay.
- Sự kiện: tên, ảnh, thời gian bắt đầu/kết thúc, mô tả, link, máy chủ.
- Thư viện: thêm ảnh kèm nhãn.
- Ảnh chụp thẳng bằng camera hoặc chọn từ thư viện, tự upload lên Supabase
  Storage qua `/api/upload` (giới hạn 5MB, chỉ file ảnh).

**Nội dung** — lọc/tìm, sửa lại (mở đúng form ở tab Đăng), xoá, mở bài trên web.

**Kiểm duyệt** — bình luận bài viết/sự kiện theo trạng thái (kèm nút *Duyệt tất
cả*), bài & trả lời diễn đàn (ghim, khoá, ẩn, khôi phục, xoá).

**Hệ thống** — người dùng (khoá/mở, đổi vai trò, tích xanh), thông báo hệ thống,
bản phát hành app, nhật ký hoạt động. Giao diện tự ẩn thao tác vượt cấp quyền.

---

## Việc cần làm khi phát hành thật

1. **Thông báo đẩy.** Code đã đăng ký token và gửi về `/api/push/native`, nhưng
   cần cấu hình dịch vụ đẩy trước khi có tác dụng:
   - Android: Gradle đã áp sẵn plugin `com.google.gms.google-services` (plugins
     DSL), chỉ cần đặt `google-services.json` vào `android/app/`. **Thiếu file
     này là không build được** — chi tiết ở [ANDROID-STUDIO.md](./ANDROID-STUDIO.md)
     mục 8. CI lấy file từ secret `GOOGLE_SERVICES_JSON`.
   - iOS: bật capability *Push Notifications* + *Background Modes → Remote
     notifications* trong Xcode, tải APNs key lên Firebase.
   iOS chưa cấu hình thì `registerPush()` im lặng bỏ qua, app vẫn chạy bình thường.
2. **Ký ứng dụng.** Android cần keystore release; iOS cần chứng chỉ Apple
   Developer (hoặc sideload bằng Sideloadly/AltStore như bản Arex Network).
3. **Đổi máy chủ** khi cần: sửa `VITE_API_BASE_URL` trong `.env` rồi `npm run sync`.

## Giới hạn đã biết

- Chưa có màn xử lý **báo cáo vi phạm** — hệ thống hiện chưa có bảng/API cho
  loại dữ liệu này.
- Soạn thảo nội dung là **chữ thuần** (xuống dòng → thẻ `<p>`), không phải trình
  soạn thảo giàu định dạng như trang `/admin`. Sửa bài viết vốn có HTML phức tạp
  bằng app sẽ làm mất định dạng — bài đó nên sửa trên web.
- Đổi email, xoá tài khoản, phân quyền chi tiết, cài đặt site: chỉ làm trên web.
