"use client";

import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { PlatformIcon } from "@/components/ui/platform-icon";
import { callPlugin, isNativeApp } from "@/lib/native/bridge";
import { NativeBottomTabBar } from "./native-bottom-tab-bar";
import { NativeHeader } from "./native-header";
import { NativeDrawer } from "./native-drawer";

interface NativeAppLayoutProps {
  children: ReactNode;
}

export function NativeAppLayout({ children }: NativeAppLayoutProps) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isAuthPage = pathname.startsWith("/login") || 
                     pathname.startsWith("/register") || 
                     pathname.startsWith("/auth/") ||
                     pathname.startsWith("/setup");

  const isAdminPage = pathname.startsWith("/admin");

  // Don't show native UI on auth/admin pages
  if (isAuthPage || isAdminPage) {
    return <>{children}</>;
  }

  return (
    <div className="native-app-container min-h-screen bg-background">
      {/* Native Header */}
      <NativeHeader 
        onMenuPress={() => setDrawerOpen(true)}
        pathname={pathname}
      />

      {/* Main Content Area */}
      <main 
        className="native-app-main flex-1 overflow-auto"
        style={{ 
          paddingBottom: "calc(88px + env(safe-area-inset-bottom, 0px))",
          paddingTop: "env(safe-area-inset-top, 0px)",
        }}
      >
        {children}
      </main>

      {/* Bottom Tab Bar - Primary Navigation */}
      <NativeBottomTabBar pathname={pathname} />

      {/* Side Drawer - Secondary Navigation */}
      <NativeDrawer 
        open={drawerOpen} 
        onClose={() => setDrawerOpen(false)}
        pathname={pathname}
      />

      {/* Native Toast Container */}
      <NativeToastContainer />
    </div>
  );
}

// Native Header Component
function NativeHeader({ onMenuPress, pathname }: { onMenuPress: () => void; pathname: string }) {
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  if (!mounted) return null;

  return (
    <header className="native-header fixed top-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border/50">
      <div className="flex h-14 items-center justify-between px-4">
        <button
          onClick={onMenuPress}
          className="native-header-btn p-2 rounded-xl transition-colors active:scale-95"
          aria-label="Menu"
        >
          <PlatformIcon ios="menu" android="menu" size={24} />
        </button>

        <div className="flex-1 text-center">
          <Link href="/" className="font-brand text-lg tracking-tight bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 bg-clip-text text-transparent">
            Arex Network
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => document.documentElement.classList.toggle("dark")}
            className="native-header-btn p-2 rounded-xl transition-colors active:scale-95"
            aria-label="Toggle theme"
          >
            <PlatformIcon 
              ios={isDark ? "theme" : "theme"} 
              android={isDark ? "theme" : "theme"} 
              size={22} 
            />
          </button>
        </div>
      </div>
    </header>
  );
}

// Native Toast Container
function NativeToastContainer() {
  const [toasts, setToasts] = useState<Array<{ id: number; message: string; type: "success" | "error" | "info" }>>([]);

  useEffect(() => {
    const handleOffline = () => {
      const id = Date.now();
      setToasts((prev) => [...prev, { id, message: "Mất kết nối mạng", type: "error" }]);
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
    };

    const handleOnline = () => {
      const id = Date.now();
      setToasts((prev) => [...prev, { id, message: "Đã kết nối lại", type: "success" }]);
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
    };

    window.addEventListener("native-offline", handleOffline);
    window.addEventListener("native-online", handleOnline);

    return () => {
      window.removeEventListener("native-offline", handleOffline);
      window.removeEventListener("native-online", handleOnline);
    };
  }, []);

  return (
    <div className="fixed bottom-24 left-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            "pointer-events-auto rounded-xl px-4 py-3 shadow-xl animate-slide-up",
            toast.type === "error" && "bg-destructive text-destructive-foreground",
            toast.type === "success" && "bg-green-600 text-white",
            toast.type === "info" && "bg-primary text-primary-foreground",
          )}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}