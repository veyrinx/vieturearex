"use client";

import Script from "next/script";
import { useEffect } from "react";
import { includedLanguages, SOURCE_LANG } from "@/lib/utils/translate-lang";

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
  useEffect(() => {
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
  }, []);

  return (
    <>
      {/* Chỗ neo bắt buộc của widget — ẩn đi, ta dùng nút chọn ngôn ngữ riêng. */}
      <div id="google_translate_element" aria-hidden className="sr-only" />
      <Script
        src="https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
        strategy="afterInteractive"
      />
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
