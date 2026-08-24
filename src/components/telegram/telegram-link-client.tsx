"use client";

import { LinkCodeClient } from "@/components/common/link-code-client";

export function TelegramLinkClient() {
  return (
    <LinkCodeClient
      endpoint="/api/telegram/link/code"
      loginNext="/telegram-link"
      codeHint="nhập trong Mini App Telegram (mục Hồ sơ)."
      steps={[
        "Bấm “Tạo mã liên kết” ở trên.",
        "Mở Mini App Arex trong Telegram → tab Hồ sơ.",
        "Nhập mã vào ô “Liên kết tài khoản” → xong!",
      ]}
      footNote="Sau khi liên kết, Mini App hiện chuỗi điểm danh, điểm & hồ sơ thật của bạn."
    />
  );
}
