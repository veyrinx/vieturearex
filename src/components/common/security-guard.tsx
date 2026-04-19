"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ShieldAlert } from "lucide-react";

const DEVTOOLS_THRESHOLD = 160;

function checkDevTools(): boolean {
  const widthGap = window.outerWidth - window.innerWidth;
  const heightGap = window.outerHeight - window.innerHeight;
  return widthGap > DEVTOOLS_THRESHOLD || heightGap > DEVTOOLS_THRESHOLD;
}

export function SecurityGuard() {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin") || pathname?.startsWith("/auth");
  const [devToolsOpen, setDevToolsOpen] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Block keyboard shortcuts
  useEffect(() => {
    const blockKeys = (e: KeyboardEvent) => {
      if (!e.key) return;
      const key = e.key.toLowerCase();
      if (e.key === "F12") { e.preventDefault(); return; }
      if (e.ctrlKey && e.shiftKey && ["i", "j", "c", "k"].includes(key)) { e.preventDefault(); return; }
      if (!isAdmin && e.ctrlKey && ["u", "s"].includes(key)) { e.preventDefault(); return; }
    };
    document.addEventListener("keydown", blockKeys);
    return () => document.removeEventListener("keydown", blockKeys);
  }, [isAdmin]);

  // Block right-click + copy on non-admin pages
  useEffect(() => {
    if (isAdmin) return;
    const blockCopy = (e: ClipboardEvent) => e.preventDefault();
    const blockCtxMenu = (e: MouseEvent) => e.preventDefault();
    document.addEventListener("copy", blockCopy);
    document.addEventListener("contextmenu", blockCtxMenu);
    return () => {
      document.removeEventListener("copy", blockCopy);
      document.removeEventListener("contextmenu", blockCtxMenu);
    };
  }, [isAdmin]);

  // DevTools detection via window size polling (non-admin only)
  useEffect(() => {
    if (isAdmin) return;

    const check = () => {
      const open = checkDevTools();
      setDevToolsOpen(open);
    };

    check();
    intervalRef.current = setInterval(check, 800);
    window.addEventListener("resize", check);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      window.removeEventListener("resize", check);
    };
  }, [isAdmin]);

  if (isAdmin || !devToolsOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[99999] flex flex-col items-center justify-center gap-4 bg-background/95 backdrop-blur-xl"
      style={{ userSelect: "none" }}
    >
      <ShieldAlert className="size-16 text-primary dark:text-amber-400" strokeWidth={1.5} />
      <div className="text-center space-y-2">
        <h2 className="font-heading text-2xl font-black uppercase tracking-[0.08em] text-foreground">
          TRUY CẬP BỊ HẠN CHẾ
        </h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          Vui lòng đóng Developer Tools để tiếp tục sử dụng trang web.
        </p>
      </div>
    </div>
  );
}
