# Arex Network — App iOS & Android

Vỏ native (Capacitor 8) bọc chính giao diện web `arexnetwork.site`.

**Vì sao làm kiểu này?** Yêu cầu là app "giống giao diện web nhất có thể". Viết
lại bằng React Native/Flutter sẽ phải dựng lại toàn bộ ~80 trang và không bao
giờ khớp 100%. Ở đây WebView nạp thẳng site thật: cùng CSS, cùng component,
cùng dữ liệu — cập nhật web là app cập nhật theo, không cần nộp bản mới.
Phần "native" là những thứ web không làm được: splash, thông báo đẩy, deep
link, nút back cứng, chia sẻ hệ thống, màn hình offline.

---

## Cấu trúc

| Đường dẫn | Vai trò |
| --- | --- |
| `capacitor.config.ts` | Cấu hình app: domain nạp vào WebView, User-Agent, splash, thanh hệ thống |
| `www/error.html` | Màn hình offline khi mất mạng (đóng gói sẵn trong app) |
| `resources/` | Ảnh nguồn để sinh icon + splash |
| `scripts/make-source-assets.mjs` | Tạo `resources/icon.png` & `splash.png` từ logo site |
| `android/` | Dự án Android Studio |
| `ios/` | Dự án Xcode |

Phần web tương ứng nằm trong repo chính:

| Đường dẫn | Vai trò |
| --- | --- |
| `src/lib/native/bridge.ts` | Gọi plugin native từ web (không cần thêm package vào bundle Next) |
| `src/components/providers/native-app-shell.tsx` | Nút back, deep link, push, offline, đồng bộ thanh trạng thái |
| `src/app/globals.css` (cuối file) | CSS riêng cho app: safe-area, ẩn quảng cáo/widget dịch |
| `src/app/auth/native-bridge/route.ts` | Đưa luồng OAuth từ trình duyệt hệ thống về lại app |
| `src/app/.well-known/…` | App Links (Android) & Universal Links (iOS) |
| `src/app/api/push/native/route.ts` | Lưu token thông báo đẩy FCM/APNs |

---

## Lệnh hay dùng

```bash
cd mobile
npm install

# Sinh lại icon + splash sau khi đổi logo
node scripts/make-source-assets.mjs && npm run assets

# Đẩy cấu hình mới sang 2 nền tảng (chạy sau mỗi lần sửa capacitor.config.ts)
npx cap sync

npm run open:android   # mở Android Studio
npm run open:ios       # mở Xcode (chỉ chạy được trên macOS)
```

Trỏ app sang môi trường khác (ví dụ preview trên Vercel):

```bash
AREX_APP_URL=https://arex-preview.vercel.app npx cap sync
```

---

## Build

### Android

Máy Windows hiện tại **chưa có JDK và Android SDK**, nên có 2 đường:

**A. Build trên GitHub Actions (không cần cài gì)**
Vào tab *Actions* → **Build app Android** → *Run workflow*:
- `apk-debug` → tải file `.apk` về cài thử trực tiếp lên máy Android.
- `aab-release` → file `.aab` nộp Google Play (cần secret keystore ở dưới).

**B. Build tại máy** — cài [Android Studio](https://developer.android.com/studio)
(kèm JDK 21 + SDK 36), rồi `npm run build:android:debug`.

Secret cần cho bản phát hành (Settings → Secrets → Actions):

| Secret | Nội dung |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | File `.jks` mã hoá base64 |
| `ANDROID_KEYSTORE_PASSWORD` | Mật khẩu keystore |
| `ANDROID_KEY_ALIAS` | Alias khoá |
| `ANDROID_KEY_PASSWORD` | Mật khẩu alias |

Tạo keystore (chạy trên máy có JDK, giữ file này thật kỹ — mất là không cập
nhật app trên Play được nữa):

```bash
keytool -genkey -v -keystore arex-release.jks -keyalg RSA -keysize 2048 \
  -validity 10000 -alias arex
base64 -w0 arex-release.jks   # đưa chuỗi này vào secret
```

### iOS

Xcode chỉ chạy trên macOS. Workflow **Build app iOS** dùng runner macOS của
GitHub:
- Chưa có secret ký → chỉ build kiểm tra biên dịch.
- Có đủ secret → xuất `.ipa` để nộp TestFlight.

| Secret | Nội dung |
| --- | --- |
| `IOS_DIST_CERT_BASE64` | Chứng chỉ phân phối `.p12` base64 |
| `IOS_DIST_CERT_PASSWORD` | Mật khẩu file `.p12` |
| `IOS_PROVISIONING_PROFILE_BASE64` | Provisioning profile `.mobileprovision` base64 |
| `IOS_PROVISIONING_PROFILE_NAME` | Tên profile trên Apple Developer |
| `IOS_TEAM_ID` | Team ID (Apple Developer → Membership) |

---

## Việc phải làm trước khi phát hành

### 1. Thông báo đẩy

- **Android**: tạo project Firebase → tải `google-services.json` → đặt vào
  `mobile/android/app/`. Gradle tự nhận (đã có sẵn đoạn kiểm tra).
- **iOS**: bật *Push Notifications* capability trong Xcode, tạo khoá APNs
  (`.p8`) ở Apple Developer. Đổi `aps-environment` trong
  `ios/App/App/App.entitlements` thành `production` khi phát hành.
- Chạy migration `supabase/migration-native-push-tokens.sql` để có bảng lưu token.
- App tự gọi `POST /api/push/native` sau khi người dùng đồng ý nhận thông báo.

### 2. Deep link (bấm link arexnetwork.site → mở app)

Đặt biến môi trường trên Vercel:

| Biến | Giá trị |
| --- | --- |
| `ANDROID_APP_SHA256_FINGERPRINTS` | Vân tay SHA-256 chứng chỉ ký (Play Console → App signing). Nhiều giá trị cách nhau dấu phẩy |
| `IOS_APP_TEAM_ID` | Team ID Apple |

Hai route `/.well-known/assetlinks.json` và `/.well-known/apple-app-site-association`
sẽ tự trả nội dung đúng. Chưa đặt biến thì trả 404 (khai sai còn tệ hơn không khai).

### 3. Đăng nhập Google/Facebook

Google chặn OAuth chạy trong WebView, nên app mở trang đăng nhập bằng **trình
duyệt hệ thống** rồi quay về qua `arex://auth/callback`. Cần thêm URL này vào
Supabase → Authentication → URL Configuration → Redirect URLs:

```
https://arexnetwork.site/auth/native-bridge
```

### 4. Quảng cáo

AdSense **cấm** hiển thị quảng cáo trong WebView của app. Site đã tự phát hiện
app native (qua User-Agent `ArexApp/`) và không nạp script AdSense, đồng thời
ẩn mọi ô quảng cáo bằng CSS. Đừng gỡ đoạn này — vi phạm là bị khoá tài khoản
AdSense.

### 5. Rủi ro duyệt App Store

Apple guideline 4.2 (*Minimum Functionality*) hay từ chối app chỉ là "website
đóng gói". Những thứ đã làm sẵn để giảm rủi ro: thông báo đẩy, deep link,
màn hình offline, chia sẻ native, rung phản hồi, nút back hệ thống. Nếu vẫn bị
từ chối, hướng bổ sung mạnh nhất là thêm tính năng chỉ có trên app (ví dụ:
widget lịch sự kiện, thông báo giải đấu theo dõi).

---

## Cách app tự nhận biết môi trường

Web biết mình đang chạy trong app qua 2 dấu hiệu:

1. `window.Capacitor.isNativePlatform()` — bridge do Capacitor tiêm vào trang.
2. User-Agent chứa `ArexApp/` — dùng được cả ở phía server (Next.js dùng để bỏ
   script AdSense ngay từ HTML).

Khi ở trong app, `<html>` được gắn `data-native="true"` và
`data-native-platform="ios" | "android"`. Muốn ẩn một thành phần chỉ dành cho
web, thêm thuộc tính `data-native-hidden` vào phần tử đó.
