"use client";

import { useEffect } from "react";

/**
 * Banner thương hiệu kiểu terminal in ra browser console khi mở web
 * + cảnh báo Self-XSS (chuẩn bảo mật giống Facebook/Discord).
 *
 * next.config bật `compiler.removeConsole` (cắt console.* ở production) nên ta
 * alias `window.console` → biến cục bộ `c`; removeConsole chỉ nhắm `console.*`
 * nên `c.*` sống sót và banner vẫn hiện trên web thật.
 */
export function ConsoleBanner() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const w = window as unknown as { __arexBanner?: boolean; console: Console };
    if (w.__arexBanner) return;
    w.__arexBanner = true;

    const c = w.console;
    if (!c || typeof c.log !== "function") return;

    const env = process.env.NODE_ENV === "production" ? "production" : "development";
    const VERSION = "1.0.0";

    const mono = "font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;";
    const s = {
      logo: `color:#22d3ee;font-weight:bold;font-size:13px;line-height:1.15;text-shadow:0 0 8px rgba(34,211,238,.45);${mono}`,
      sub: `color:#38bdf8;font-weight:bold;font-size:12px;letter-spacing:6px;${mono}`,
      brand: `color:#e2e8f0;font-size:13px;font-weight:600;${mono}`,
      tag: `color:#64748b;font-size:12px;${mono}`,
      rule: `color:#1e293b;${mono}`,
      ok: `color:#22c55e;font-weight:bold;${mono}`,
      key: `color:#94a3b8;${mono}`,
      val: `color:#e2e8f0;${mono}`,
      prompt: `color:#475569;${mono}`,
      stop: "color:#fff;background:#dc2626;font-size:22px;font-weight:900;padding:6px 16px;border-radius:6px;" + mono,
      warnHead: `color:#f8fafc;font-size:14px;font-weight:700;${mono}`,
      warn: `color:#fca5a5;font-size:13px;line-height:1.5;${mono}`,
      link: `color:#22d3ee;text-decoration:underline;${mono}`,
      foot: `color:#64748b;font-size:12px;${mono}`,
    };

    const logo = [
      "",
      "   █████╗ ██████╗ ███████╗██╗  ██╗",
      "  ██╔══██╗██╔══██╗██╔════╝╚██╗██╔╝",
      "  ███████║██████╔╝█████╗   ╚███╔╝ ",
      "  ██╔══██║██╔══██╗██╔══╝   ██╔██╗ ",
      "  ██║  ██║██║  ██║███████╗██╔╝ ██╗",
      "  ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝",
    ].join("\n");
    const rule = "─".repeat(50);

    c.log(`%c${logo}`, s.logo);
    c.log("%c      N  E  T  W  O  R  K", s.sub);
    c.log("");
    c.log("%cArex Network%c · Cộng đồng Free Fire Việt Nam", s.brand, s.tag);
    c.log(`%c${rule}`, s.rule);

    c.log("%cvisitor@arexnetwork:~$ ./boot", s.prompt);
    const ok = (name: string, val: string) =>
      c.log(`%c [ OK ] %c${name.padEnd(11)}%c${val}`, s.ok, s.key, s.val);
    ok("Version", `v${VERSION}`);
    ok("Env", env);
    ok("Region", "sin1 · Vietnam");
    ok("Website", "https://arexnetwork.site");
    c.log("%c [ OK ] %cHệ thống sẵn sàng.", s.ok, s.val);
    c.log(`%c${rule}`, s.rule);

    // Cảnh báo Self-XSS
    c.log("%c⛔ DỪNG LẠI!", s.stop);
    c.log("%cĐây là bảng điều khiển dành cho lập trình viên.", s.warnHead);
    c.log(
      "%cNếu ai đó bảo bạn dán / nhập code vào đây để “mở khoá” hay “hack” tính năng —\n" +
        "đó là LỪA ĐẢO (Self-XSS) và có thể chiếm tài khoản của bạn. Đừng dán thứ bạn không hiểu.",
      s.warn,
    );
    c.log(`%c${rule}`, s.rule);

    c.log("%c💼 Thích Arex Network? Gia nhập team → %chttps://arexnetwork.site/tuyen-thanh-vien", s.foot, s.link);
    c.log("%c© 2026 Arex Network · Made with ⚡ in Vietnam", s.foot);
  }, []);

  return null;
}
