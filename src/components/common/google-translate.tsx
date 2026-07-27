"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import { includedLanguages, readCurrentLang, SOURCE_LANG } from "@/lib/utils/translate-lang";

// Widget Google Dịch nhúng trong trang. Dịch tại chỗ theo cookie `googtrans`,
// giữ nguyên 1 URL của site. Kết hợp <TranslateGuard/> để điều hướng Next không
// crash khi Google chỉnh sửa DOM.

type TranslateElementCtor = new (
  opts: {
    pageLanguage: string;
    includedLanguages: string;
    autoDisplay: boolean;
    layout?: unknown;
  },
  el: string,
) => void;

declare global {
  interface Window {
    googleTranslateElementInit?: () => void;
    google?: {
      translate?: {
        TranslateElement: TranslateElementCtor & { InlineLayout?: { SIMPLE: unknown } };
      };
    };
  }
}

export function GoogleTranslate() {
  // Chỉ nạp element.js khi người dùng thật sự chọn ngôn ngữ khác tiếng Việt.
  // Nạp sẵn cho mọi khách sẽ khiến Google viết lại text node ngay lúc React
  // hydrate (lỗi React #418) và kéo theo loạt cảnh báo CSP không cần thiết.
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (readCurrentLang() === SOURCE_LANG) return;
    window.googleTranslateElementInit = () => {
      const T = window.google?.translate?.TranslateElement;
      if (!T) return;
      new T(
        {
          pageLanguage: SOURCE_LANG,
          includedLanguages: includedLanguages(),
          autoDisplay: false,
          layout: T.InlineLayout?.SIMPLE,
        },
        "google_translate_element",
      );
    };
    setEnabled(true);
  }, []);

  return (
    <>
      {/* Chỗ neo bắt buộc của widget — ẩn đi, ta dùng nút chọn ngôn ngữ riêng. */}
      <div id="google_translate_element" aria-hidden className="sr-only" />
      {enabled && (
        <Script
          src="https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
          // lazyOnload = chạy sau khi React hydrate xong, tránh lệch DOM.
          strategy="lazyOnload"
        />
      )}
      {/* Ẩn thanh/khung mặc định của Google + không đẩy body xuống. */}
      <style>{`
        .goog-te-banner-frame, .goog-te-balloon-frame, #goog-gt-tt, .goog-tooltip { display: none !important; }
        .goog-te-gadget, .goog-te-combo { display: none !important; }
        body { top: 0 !important; position: static !important; }
        .skiptranslate iframe { visibility: hidden !important; height: 0 !important; }
        font[style] { background: none !important; box-shadow: none !important; }
      `}</style>
    </>
  );
}
