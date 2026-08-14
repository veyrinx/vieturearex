"use client";

import { useEffect, useState } from "react";
import Script from "next/script";

/**
 * Nạp loader AdSense, trừ khi đang chạy trong app native.
 *
 * Chính sách AdSense cấm hiển thị quảng cáo trong WebView của app, nên phải chặn
 * từ khâu nạp script chứ không phải chỉ ẩn bằng CSS.
 *
 * Trước đây layout đọc User-Agent phía server để quyết định. Nhưng đọc header
 * làm mọi trang phải render động, không trang nào được cache trên CDN — xem
 * NEXT_PUBLIC_SITE_ID trong lib/server/get-site-config.ts. Nay việc nhận diện
 * chuyển sang phía client, dựa vào data-native mà đoạn script trong <head> đã
 * gắn lên <html> TRƯỚC khi vẽ (nên không có nháy quảng cáo trong app).
 *
 * @param serverKnownNative Server đã chắc chắn đây là app native (chỉ biết được
 *   khi bản triển khai còn đọc header). Đúng thì chặn luôn, khỏi đợi client.
 */
export function AdsenseLoader({
  adsenseId,
  serverKnownNative = false,
}: {
  adsenseId: string;
  serverKnownNative?: boolean;
}) {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (serverKnownNative) return;
    // data-native do script chèn trong <head> gắn sẵn; đọc thêm Capacitor phòng
    // trường hợp script đó chưa kịp chạy.
    const el = document.documentElement;
    const cap = (window as unknown as {
      Capacitor?: { isNativePlatform?: () => boolean };
    }).Capacitor;
    const native =
      el.dataset.native === "true"
      || Boolean(cap?.isNativePlatform?.())
      || /ArexApp\//.test(navigator.userAgent);
    if (!native) setAllowed(true);
  }, [serverKnownNative]);

  if (!allowed) return null;

  return (
    <Script
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseId}`}
      strategy="afterInteractive"
      crossOrigin="anonymous"
    />
  );
}
