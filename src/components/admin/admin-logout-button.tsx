"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function AdminLogoutButton() {
  const router = useRouter();

  const onLogout = async () => {
    await fetch("/api/auth/demo-logout", {
      method: "POST",
    }).catch(() => null);

    const supabase = createClient();
    if (supabase) {
      await supabase.auth.signOut().catch(() => null);
    }

    toast.success("ĐÃ ĐĂNG XUẤT KHỎI TRANG QUẢN TRỊ.");
    router.push("/auth/login");
    router.refresh();
  };

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full justify-start rounded-xl border-border bg-background/80 text-foreground"
      onClick={onLogout}
    >
      <LogOut className="mr-2 size-4" />
      ĐĂNG XUẤT
    </Button>
  );
}
