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
      logo: `color:#0ea5e9;font-weight:bold;font-size:14px;line-height:1.1;text-shadow:0 0 10px rgba(14,165,233,.4);${mono}`,
      sub: `color:#38bdf8;font-weight:bold;font-size:12px;letter-spacing:4px;${mono}`,
      brand: `color:#f8fafc;font-size:14px;font-weight:600;${mono}`,
      tag: `color:#94a3b8;font-size:12px;${mono}`,
      rule: `color:#334155;${mono}`,
      ok: `background:#16a34a;color:white;padding:1px 6px;border-radius:4px;font-weight:bold;font-size:10px;`,
      key: `color:#a1a1aa;${mono}`,
      val: `color:#f4f4f5;font-weight:600;${mono}`,
      prompt: `color:#52525b;${mono}`,
      stop: "color:#fff;background:#ef4444;font-size:24px;font-weight:900;padding:8px 18px;border-radius:8px;text-shadow:0 2px 4px rgba(0,0,0,.2);" + mono,
      warnHead: `color:#fecaca;font-size:16px;font-weight:700;${mono}`,
      warn: `color:#fca5a5;font-size:14px;line-height:1.6;${mono}`,
      link: `color:#38bdf8;text-decoration:underline;${mono}`,
      foot: `color:#71717a;font-size:12px;${mono}`,
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
      c.log(`%c OK %c ${name.padEnd(11)} %c${val}`, s.ok, s.key, s.val);
    ok("Version", `v${VERSION}`);
    ok("Env", env);
    ok("Region", "sin1 · Vietnam");
    ok("Website", "https://arexnetwork.site");
    c.log("%c OK %c Hệ thống sẵn sàng.", s.ok, s.val);
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
