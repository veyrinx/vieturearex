# Cài Arex Hub bằng Android Studio

Hướng dẫn dựng app **Arex Hub** (`mobile-hub/`) từ mã nguồn và cài lên điện thoại
Android hoặc máy ảo, làm trên máy Windows.

> Arex Hub **không phải WebView**. Giao diện là bundle React nằm trong app, nên
> **mỗi lần sửa code web đều phải `npm run sync`** trước khi build lại — quên
> bước này thì app vẫn chạy bản cũ (hoặc màn hình trắng nếu `dist/` rỗng).

---

## 1. Cài phần mềm cần có

| Phần mềm | Bản dùng | Lấy ở đâu |
|---|---|---|
| Node.js | 20 trở lên (CI dùng 22) | https://nodejs.org |
| Android Studio | Bản mới nhất (Ladybug trở lên) | https://developer.android.com/studio |
| JDK | **21** | Đi kèm Android Studio (JBR), không cần cài riêng |

Kiểm tra Node:

```powershell
node -v
npm -v
```

### Cài SDK trong Android Studio

Mở Android Studio → **More Actions → SDK Manager** (hoặc `File → Settings →
Languages & Frameworks → Android SDK`).

Tab **SDK Platforms** — tick:
- **Android API 36** (dự án đặt `compileSdk = 36`, `targetSdk = 36`)

Tab **SDK Tools** — tick:
- Android SDK Build-Tools
- Android SDK Platform-Tools (có `adb`)
- Android Emulator (nếu định chạy máy ảo)
- Android SDK Command-line Tools (latest)

Bấm **Apply** rồi chờ tải xong.

`minSdk = 24` → app chạy được từ Android 7.0 trở lên.

---

## 2. Chuẩn bị mã nguồn

```powershell
cd D:\vieture-arex\mobile-hub
npm install
Copy-Item .env.example .env
```

File `.env` mặc định trỏ về production `https://arexnetwork.site`. Muốn test với
`next dev` chạy trên máy thì sửa:

```env
VITE_API_BASE_URL=http://192.168.1.x:3000
```

Dùng **IP LAN**, không dùng `localhost` — với điện thoại, `localhost` là chính nó.

### Dựng bundle + đồng bộ sang Android

```powershell
npm run sync
```

Lệnh này = `npm run build` (Vite → `dist/`) + `cap sync` (chép `dist/` vào
`android/app/src/main/assets/public/` và cập nhật danh sách plugin native).

---

## 3. Mở dự án trong Android Studio

```powershell
npm run open:android
```

Hoặc mở Android Studio → **Open** → chọn thư mục `D:\vieture-arex\mobile-hub\android`
(chọn đúng thư mục `android`, **không** chọn `mobile-hub`).

Lần đầu Studio sẽ:
1. Tải Gradle 8.14.3 (xem `android/gradle/wrapper/gradle-wrapper.properties`) — mất vài phút.
2. Chạy **Gradle Sync**. Đợi thanh dưới cùng chạy xong, không báo đỏ mới làm tiếp.

Nếu Studio hỏi nâng cấp Android Gradle Plugin → **bấm "Don't remind me again"**.
Capacitor sinh ra cấu hình này, nâng cấp tay dễ vỡ và sẽ bị `cap sync` ghi đè.

---

## 4. Chọn thiết bị

### Máy thật (khuyến nghị — test được camera, thông báo, haptics)

1. Trên điện thoại: **Cài đặt → Giới thiệu điện thoại** → bấm **Số bản dựng** 7 lần
   để bật Tuỳ chọn nhà phát triển.
2. **Cài đặt → Tuỳ chọn nhà phát triển** → bật **Gỡ lỗi USB**.
3. Cắm cáp USB vào máy tính, chọn chế độ **Truyền tệp (MTP)**.
4. Điện thoại hiện hộp thoại "Cho phép gỡ lỗi USB?" → tick *Luôn cho phép* → **OK**.

Kiểm tra máy tính đã thấy máy:

```powershell
adb devices
```

Ra dòng `<serial>  device` là được. Nếu ra `unauthorized` → rút cáp cắm lại và
đồng ý hộp thoại trên điện thoại.

> `adb` nằm ở `%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe`. Nếu lệnh
> không chạy, thêm thư mục đó vào PATH hoặc gọi bằng đường dẫn đầy đủ.

### Máy ảo

Android Studio → **Device Manager → Create Device** → chọn Pixel 7 → chọn system
image **API 36** (bản có Google Play nếu cần test thông báo đẩy) → Finish → bấm ▶.

---

## 5. Chạy app

Trong Android Studio: chọn thiết bị ở thanh trên, cấu hình chạy để **app**, bấm
nút ▶ **Run**.

Hoặc chạy thẳng bằng dòng lệnh, không cần mở Studio:

```powershell
cd D:\vieture-arex\mobile-hub
npm run run:android          # build + cài vào thiết bị đang cắm
```

Đăng nhập bằng tài khoản Supabase có vai trò **Support trở lên**. Tài khoản
thường sẽ bị chặn ngay ở màn hình đăng nhập.

---

## 6. Xuất file cài (APK)

### APK debug — dùng để gửi người khác cài thử

```powershell
npm run build:android:debug
```

File ra: `mobile-hub/android/app/build/outputs/apk/debug/app-debug.apk`

Trong Studio: **Build → Build Bundle(s) / APK(s) → Build APK(s)**.

APK debug cài được thẳng lên máy (bật *Cài từ nguồn không xác định*), nhưng đã ký
bằng khoá debug nên **không nộp Play Store được**.

### AAB release — nộp Play Store

```powershell
npm run build:android:release
```

Lệnh này chỉ chạy được **sau khi đã cấu hình ký** ở mục 7. Chưa cấu hình thì file
ra chưa ký, không cài và không nộp được.

---

## 7. Cấu hình ký release

`android/app/build.gradle` hiện **chưa** khai `signingConfig`. Cần làm một lần:

**Bước 1 — tạo keystore** (Android Studio: *Build → Generate Signed App Bundle /
APK → Create new*, hoặc dòng lệnh):

```powershell
& "$env:LOCALAPPDATA\Android\Sdk\..\jbr\bin\keytool.exe" -genkey -v `
  -keystore D:\keys\arex-hub.jks -keyalg RSA -keysize 2048 -validity 10000 -alias arexhub
```

> **Giữ file `.jks` và mật khẩu thật kỹ.** Mất là không cập nhật được app trên
> Play Store nữa, phải đăng app mới.

**Bước 2 — tạo `android/keystore.properties`** (đã nằm trong `.gitignore`):

```properties
storeFile=D:/keys/arex-hub.jks
storePassword=***
keyAlias=arexhub
keyPassword=***
```

**Bước 3 — sửa `android/app/build.gradle`**, thêm vào trong khối `android { }`:

```gradle
def keystorePropsFile = rootProject.file("keystore.properties")

signingConfigs {
    release {
        if (keystorePropsFile.exists()) {
            def props = new Properties()
            props.load(new FileInputStream(keystorePropsFile))
            storeFile file(props['storeFile'])
            storePassword props['storePassword']
            keyAlias props['keyAlias']
            keyPassword props['keyPassword']
        }
    }
}

buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled false
        proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
    }
}
```

(thay khối `buildTypes` cũ, đừng để hai khối trùng tên)

**Bước 4 — tăng số bản** mỗi lần phát hành, trong `defaultConfig`:

```gradle
versionCode 2          // tăng 1 mỗi lần nộp
versionName "1.0.1"
```

---

## 8. Firebase (bắt buộc để build được)

> ⚠️ **`google-services.json` giờ là bắt buộc.** Dự án đã chuyển sang plugins DSL
> theo đúng hướng dẫn của Firebase Console, nghĩa là plugin được áp **vô điều
> kiện**. Không có file này thì Gradle dừng ngay:
> `File google-services.json is missing. The Google Services Plugin cannot function without it.`

### Lấy file

1. Firebase Console → **Add app → Android**, package **`site.arexnetwork.hub`**
   (phải trùng `applicationId`, sai một ký tự là push không tới).
2. Tải `google-services.json` → đặt vào `mobile-hub/android/app/`.
3. `npm run sync` rồi build.

File này nằm trong `.gitignore`, **không commit**. Mỗi máy dev tự tải một lần.

### Cấu hình Gradle đang dùng

`android/settings.gradle` — plugins DSL phải biết lấy plugin ở đâu:

```gradle
pluginManagement {
    repositories { google(); mavenCentral(); gradlePluginPortal() }
}
```

`google()` là bắt buộc: `com.google.gms.google-services` nằm trên Google Maven,
không có trên Gradle Plugin Portal. Thiếu dòng đó là sync báo *Plugin not found*.

`android/build.gradle`:

```gradle
plugins {
    id 'com.android.application' version '8.13.0' apply false
    id 'com.google.gms.google-services' version '4.5.0' apply false
}
```

`android/app/build.gradle`:

```gradle
plugins {
    id 'com.android.application'
    id 'com.google.gms.google-services'
}

dependencies {
    implementation platform("com.google.firebase:firebase-bom:34.16.0")
    implementation "com.google.firebase:firebase-analytics"
    // ...
}
```

**`firebase-messaging` không khai ở đây** — `@capacitor/push-notifications` đã
kéo sẵn bản riêng trong module của nó. Khai thêm chỉ tạo xung đột version. BOM
chỉ khoá version cho những thư viện Firebase khai **không kèm số**.

Thư viện Firebase khác (Crashlytics, Remote Config...) thêm dưới BOM và **bỏ số
version**, BOM tự chọn bản khớp nhau.

### Build trên GitHub Actions

Vì plugin áp vô điều kiện mà file thì bị `.gitignore` chặn, workflow phải tự dựng
lại file từ secret — `hub-android.yml` đã có bước **"Ghi google-services.json"**.

Tạo secret một lần: **Settings → Secrets and variables → Actions → New repository
secret**, tên `GOOGLE_SERVICES_JSON`, dán **nguyên nội dung** file tải từ Firebase
Console (cả dấu `{` `}`). Chưa có secret thì workflow dừng sớm kèm thông báo rõ
ràng thay vì để Gradle báo lỗi khó hiểu.

### Muốn quay lại kiểu cũ (build được khi thiếu file)

Bỏ `id 'com.google.gms.google-services'` khỏi khối `plugins` của
`android/app/build.gradle`, thay bằng đoạn cuối file:

```gradle
try {
    def servicesJSON = file('google-services.json')
    if (servicesJSON.text) {
        apply plugin: 'com.google.gms.google-services'
    }
} catch(Exception e) {
    logger.info("google-services.json not found — push sẽ không chạy")
}
```

Đây là mặc định Capacitor sinh ra: thiếu file thì app vẫn build, chỉ mất push.

---

## 9. Xử lý lỗi hay gặp

| Hiện tượng | Nguyên nhân / cách sửa |
|---|---|
| Mở app ra **màn hình trắng** | Quên `npm run sync` → `assets/public/` rỗng. Chạy lại rồi build. |
| Sửa code mà app không đổi | Cũng là quên `npm run sync`. Build Gradle không tự chạy Vite. |
| `SDK location not found` | Tạo `android/local.properties` với `sdk.dir=C\:\\Users\\<user>\\AppData\\Local\\Android\\Sdk` — hoặc mở dự án bằng Studio một lần để nó tự sinh. |
| `Unsupported class file major version` / lỗi JDK | Studio đang dùng JDK khác 21. `Settings → Build Tools → Gradle → Gradle JDK` → chọn **jbr-21**. |
| `Failed to find target with hash string android-36` | Chưa cài SDK Platform 36 (mục 1). |
| Gradle sync treo / tải mãi | Mạng chặn `services.gradle.org`. Đổi mạng, hoặc dùng CI (mục 10). |
| `File google-services.json is missing` | Chưa tải file từ Firebase Console về `android/app/` (mục 8). |
| `Plugin [id: 'com.google.gms.google-services'] was not found` | `settings.gradle` thiếu `pluginManagement { repositories { google() } }`. |
| CI đỏ ở bước *Ghi google-services.json* | Chưa tạo secret `GOOGLE_SERVICES_JSON` trong repo. |
| `adb: device unauthorized` | Rút cắm lại cáp, đồng ý hộp thoại gỡ lỗi USB trên máy. |
| `INSTALL_FAILED_UPDATE_INCOMPATIBLE` | Trên máy đang có bản ký bằng khoá khác. Gỡ app cũ rồi cài lại. |
| Đăng nhập báo không đủ quyền | Tài khoản chưa đạt vai trò Support. |
| Gọi API lỗi mạng khi test local | `VITE_API_BASE_URL` đang là `localhost`. Đổi sang IP LAN rồi `npm run sync`. |

Xem log app khi chạy: tab **Logcat** trong Studio, lọc theo package
`site.arexnetwork.hub`. Muốn debug được cả phần web (Chrome DevTools) thì đặt
`webContentsDebuggingEnabled: true` trong `capacitor.config.ts`, `npm run sync`,
rồi mở `chrome://inspect` trên máy tính — **nhớ đổi lại `false` trước khi phát hành**.

---

## 10. Không cài được Android Studio?

Có sẵn workflow build trên GitHub Actions:
`.github/workflows/hub-android.yml` → tab **Actions → Build Arex Hub Android →
Run workflow**. Chạy xong tải APK debug ở mục **Artifacts** (giữ 14 ngày).

---

## 11. Sau lần cài đầu: dùng cập nhật nóng

Đã cài app một lần rồi thì sửa giao diện **không cần build lại Android Studio**:

```powershell
cd D:\vieture-arex\mobile-hub; npm run build; cd ..
node scripts\upload-hub-bundle.mjs --version 1.0.1 --notes "Sửa lỗi đăng nhập"
```

Trong app: **Hệ thống → Cập nhật app → Cập nhật ngay**.

Chỉ phải dựng lại bằng Android Studio khi đổi **plugin native, quyền, icon,
splash, `appId` hoặc `versionCode`**. Chi tiết xem [README.md](./README.md).
