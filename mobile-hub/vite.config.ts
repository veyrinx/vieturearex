import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  build: {
    // WebView của iOS 15 / Android 8 trở lên — không cần transpile xuống thấp hơn.
    target: "es2020",
    outDir: "dist",
    sourcemap: false,
  },
  server: { port: 5180, host: true },
});
