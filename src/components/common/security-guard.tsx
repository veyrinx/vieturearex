"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function SecurityGuard() {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin") || pathname?.startsWith("/auth");

  useEffect(() => {
    if (isAdmin) return;

    // Chặn copy
    const blockCopy = (e: ClipboardEvent) => e.preventDefault();
    document.addEventListener("copy", blockCopy);

    // Chặn chuột phải
    const blockContextMenu = (e: MouseEvent) => e.preventDefault();
    document.addEventListener("contextmenu", blockContextMenu);

    return () => {
      document.removeEventListener("copy", blockCopy);
      document.removeEventListener("contextmenu", blockContextMenu);
    };
  }, [isAdmin]);

  useEffect(() => {
    // Chặn phím tắt DevTools (áp dụng mọi nơi)
    const blockKeys = (e: KeyboardEvent) => {
      if (!e.key) return;
      const key = e.key.toLowerCase();
      if (e.key === "F12") { e.preventDefault(); return; }
      if (e.ctrlKey && e.shiftKey && ["i", "j", "c"].includes(key)) { e.preventDefault(); return; }
      if (!isAdmin && e.ctrlKey && ["u", "s"].includes(key)) { e.preventDefault(); return; }
    };
    document.addEventListener("keydown", blockKeys);
    return () => document.removeEventListener("keydown", blockKeys);
  }, [isAdmin]);

  return null;
}
