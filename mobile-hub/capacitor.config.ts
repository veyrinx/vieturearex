import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Arex Hub — app quản trị native.
 *
 * KHÁC hẳn `mobile/` (Arex Network): app này KHÔNG phải vỏ WebView bọc website.
 * Toàn bộ giao diện là bundle React đóng gói sẵn trong app (`webDir: "dist"`),
 * chạy offline-first; dữ liệu lấy qua REST `https://arexnetwork.site/api/*`
 * kèm `Authorization: Bearer <supabase jwt>` (xem src/lib/api.ts).
 *
 * Vì thế KHÔNG khai báo `server.url` — có khai báo là quay lại kiểu WebView.
 */
const config: CapacitorConfig = {
  appId: "site.arexnetwork.hub",
  appName: "Arex Hub",
  webDir: "dist",

  // Bundle chạy nội bộ nên user-agent chỉ để backend nhận diện nguồn gọi API.
  appendUserAgent: "ArexHub/1.0",

  android: {
    appendUserAgent: "ArexHub/1.0 ArexHubAndroid",
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
    backgroundColor: "#070b14",
  },

  ios: {
    appendUserAgent: "ArexHub/1.0 ArexHubIOS",
    contentInset: "never",
    backgroundColor: "#070b14",
    scrollEnabled: true,
  },

  plugins: {
    /**
     * Cập nhật nóng bundle web (xem src/lib/updater.ts).
     *
     * `autoUpdate: false` vì app tự hỏi server rồi để người dùng bấm "Cập nhật"
     * — không dùng dịch vụ đám mây của Capgo, bundle nằm ở Supabase Storage.
     * `resetWhenUpdate` để khi cài đè bản native mới thì quay về bundle gốc,
     * tránh bundle OTA cũ đè lên app mới.
     */
    CapacitorUpdater: {
      autoUpdate: false,
      resetWhenUpdate: true,
    },
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: false, // React tự ẩn khi khung app đã render (src/lib/native.ts)
      backgroundColor: "#070b14ff",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: false,
    },
    // Android 16 bắt buộc edge-to-edge — web tự chừa chỗ bằng env(safe-area-inset-*).
    SystemBars: {
      style: "DARK", // nền tối → chữ thanh trạng thái màu sáng
      insetsHandling: "css",
    },
    Keyboard: {
      resize: "native",
      resizeOnFullScreen: true,
    },
    /**
     * Thông báo đẩy: **chỉ Android**. Cần android/app/google-services.json —
     * @capacitor/push-notifications trên Android trả đúng token FCM, khớp với
     * thứ server đang gửi.
     *
     * iOS đã gỡ hẳn (xem registerPush trong src/lib/native.ts): bản iOS phân
     * phối bằng sideload, mà Apple không cấp quyền Push Notifications cho tài
     * khoản miễn phí nên thông báo đẩy không có đường nào chạy. Đổi lại, không
     * còn phải nhúng Firebase SDK và giữ GoogleService-Info.plist cho iOS —
     * thiếu file đó là app chết ngay lúc mở.
     */
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
