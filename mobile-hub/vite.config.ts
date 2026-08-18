import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import fs from "node:fs";
import path from "node:path";

// Số phiên bản chỉ khai ở package.json rồi chảy ra mọi nơi: màn Hệ thống,
// token thông báo đẩy, bundle OTA, versionName của Android. Bump bằng
// `npm version patch --no-git-tag-version` (hoặc sửa tay) là xong.
const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, "package.json"), "utf8"));

// CI đặt VITE_APP_VERSION = "<version>-<số run>" để mỗi bản build là một phiên
// bản riêng; app so số này với bản mới nhất trong kho để nhắc cập nhật.
const appVersion = process.env.VITE_APP_VERSION?.trim() || pkg.version;

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(appVersion) },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    // WebView của iOS 15 / Android 8 trở lên — không cần transpile xuống thấp hơn.
    target: "es2020",
    outDir: "dist",
    sourcemap: false,
  },
  server: { port: 5180, host: true },
});
