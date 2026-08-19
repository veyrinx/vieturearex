import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Vỏ native cho www.arexnetwork.vn (tên miền Vercel phục vụ trực tiếp).
 *
 * App nạp thẳng site production trong WebView nên giao diện native trùng khít
 * 100% với web (cùng CSS, cùng component, cùng dữ liệu). Phần "native" nằm ở
 * splash, status bar, push, deep link, back button, chia sẻ, rung, offline.
 *
 * Đổi domain: sửa SITE_URL (hoặc set env AREX_APP_URL trước khi chạy `cap sync`).
 */
const SITE_URL = process.env.AREX_APP_URL ?? "https://www.arexnetwork.vn";

const config: CapacitorConfig = {
  appId: "site.arexnetwork.app",
  appName: "Arex Network",
  webDir: "www",

  server: {
    // Nạp trực tiếp site thật. `www/index.html` chỉ đóng vai trò màn hình
    // offline/dự phòng khi không có mạng.
    url: SITE_URL,
    cleartext: false,
    // Mất mạng / server lỗi → hiện trang offline đóng gói sẵn thay vì màn hình
    // "Webpage not available" xấu xí của WebView.
    errorPath: "error.html",
    // Chỉ những host này được mở TRONG app; còn lại đẩy ra trình duyệt hệ thống.
    //
    // ⚠️ Site chạy song song hai tên miền và tên miền này có thể 30x sang tên
    // miền kia. Thiếu một cái trong danh sách là WebView coi đích đến của lần
    // chuyển hướng là "web lạ" và đá thẳng ra Safari/Chrome — người dùng mở app
    // ra thấy trình duyệt bật lên, tưởng app hỏng. Thêm tên miền mới cho site
    // thì phải thêm cả ở đây (đối chiếu AREX_DOMAINS trong
    // src/lib/constants/site.ts) rồi chạy lại `npx cap sync`.
    allowNavigation: [
      "arexnetwork.site",
      "www.arexnetwork.site",
      "*.arexnetwork.site",
      "arexnetwork.vn",
      "www.arexnetwork.vn",
      "*.arexnetwork.vn",
      "*.supabase.co",
    ],
  },

  // Web đọc chuỗi này để biết đang chạy trong app native (ẩn quảng cáo, chừa
  // safe-area, bật luồng đăng nhập Google qua trình duyệt hệ thống…).
  appendUserAgent: "ArexApp/1.1",

  android: {
    appendUserAgent: "ArexApp/1.1 ArexAndroid",
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
    backgroundColor: "#0a0a0a",
  },

  ios: {
    appendUserAgent: "ArexApp/1.1 ArexIOS",
    contentInset: "never",
    limitsNavigationsToAppBoundDomains: false,
    backgroundColor: "#ffffff",
    scrollEnabled: true,
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: false, // web tự ẩn khi site đã render xong
      backgroundColor: "#0a0a0aff",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: false,
    },
    // Android 16 bắt buộc edge-to-edge: web nhận env(safe-area-inset-*) và tự
    // chừa chỗ cho thanh trạng thái / thanh điều hướng (xem globals.css).
    // Màu chữ của thanh hệ thống được web đồng bộ theo theme sáng/tối lúc chạy.
    SystemBars: {
      style: "DEFAULT",
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
