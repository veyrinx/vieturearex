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
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
