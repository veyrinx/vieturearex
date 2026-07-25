import "server-only";
import type { NextRequest } from "next/server";

export interface ClientNetInfo {
  ip: string;
  device: string;
  browser: string;
  ua: string;
}

/** Rút thông tin IP + thiết bị + trình duyệt từ header request (best-effort). */
export function clientNetInfo(request: NextRequest): ClientNetInfo {
  const h = request.headers;
  const ip =
    (h.get("x-forwarded-for")?.split(",")[0]?.trim()) ||
    h.get("x-real-ip") ||
    h.get("cf-connecting-ip") ||
    "—";
  const ua = h.get("user-agent") || "";

  return { ip, ua, device: detectDevice(ua), browser: detectBrowser(ua) };
}

function detectDevice(ua: string): string {
  if (!ua) return "—";
  if (/iPad/i.test(ua)) return "iPad";
  if (/iPhone/i.test(ua)) return "iPhone";
  if (/Android/i.test(ua)) return /Mobile/i.test(ua) ? "Android (điện thoại)" : "Android (tablet)";
  if (/Windows/i.test(ua)) return "Windows PC";
  if (/Macintosh|Mac OS X/i.test(ua)) return "Mac";
  if (/Linux/i.test(ua)) return "Linux";
  return "Khác";
}

function detectBrowser(ua: string): string {
  if (!ua) return "—";
  if (/Zalo/i.test(ua)) return "Zalo";
  if (/FBAN|FBAV|FB_IAB/i.test(ua)) return "Facebook App";
  if (/Edg\//i.test(ua)) return "Edge";
  if (/OPR\/|Opera/i.test(ua)) return "Opera";
  if (/SamsungBrowser/i.test(ua)) return "Samsung Internet";
  if (/CriOS/i.test(ua)) return "Chrome (iOS)";
  if (/Chrome\//i.test(ua)) return "Chrome";
  if (/Firefox\//i.test(ua)) return "Firefox";
  if (/Safari\//i.test(ua)) return "Safari";
  return "Khác";
}
