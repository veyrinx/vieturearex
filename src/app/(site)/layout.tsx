import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { SiteNavbar } from "@/components/layout/site-navbar";
import { SiteFooter } from "@/components/layout/site-footer";
import { BottomTabBarProvider } from "@/components/layout/bottom-tab-bar";
import { PageTransition } from "@/components/common/page-transition";
import { AutoReload } from "@/components/common/auto-reload";
import { AnnouncementBanner } from "@/components/common/announcement-banner";
import { AdminLockBanner } from "@/components/common/admin-lock-banner";
import { ScrollToTop } from "@/components/common/scroll-to-top";
import { DailyCheckinTrigger } from "@/components/common/daily-checkin-trigger";
import { CskhChat } from "@/components/community/cskh-chat";
import { getSettings } from "@/lib/data/content-service";
import { buildSettingsMap } from "@/lib/utils/site-settings";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSiteConfig } from "@/lib/server/get-site-config";

// KHÔNG đặt force-dynamic ở đây. Layout này bọc toàn bộ trang công khai, nên
// force-dynamic sẽ đè lên `export const revalidate` của MỌI trang con — mọi
// trang đều phải render lại từng lượt xem dù đã tự khai muốn được cache.
//
// Khi chưa ghim site (NEXT_PUBLIC_SITE_ID trống), getSiteConfig() vẫn đọc header
// nên các trang vẫn động y như trước — bỏ dòng này không đổi gì. Ghim site rồi
// thì mỗi trang mới được cache theo `revalidate` của chính nó.
//
// Lưu ý khi đã ghim: bật chế độ bảo trì có thể mất tới `revalidate` giây mới
// chặn được các trang đang nằm sẵn trong bộ nhớ đệm.

type SiteLayoutProps = {
  children: ReactNode;
};

export default async function SiteLayout({ children }: SiteLayoutProps) {
  const [settings, activeSite] = await Promise.all([getSettings(), getSiteConfig()]);
  const settingsMap = buildSettingsMap(settings, activeSite.id);

  if (settingsMap["site.maintenance_mode"] === "true") {
    const supabase = createServerSupabaseClient();
    const adminRoles = ["super_admin", "admin", "manager", "support"];
    let isAdmin = false;
    if (supabase) {
      const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
      if (user) {
        const { data: profile } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .maybeSingle<{ role: string }>();
        if (profile?.role && adminRoles.includes(profile.role)) {
          isAdmin = true;
        }
      }
    }
    if (!isAdmin) redirect("/maintenance");
  }

  return (
    <div className="relative min-h-screen">
      <AutoReload />
      <SiteNavbar
        logoLight={settingsMap["branding.logo_light_url"]}
        logoDark={settingsMap["branding.logo_dark_url"]}
        siteName={settingsMap["branding.site_name"] || activeSite.shortName}
      />
      <BottomTabBarProvider>
        <PageTransition>
          <main className="mx-auto w-full max-w-7xl px-4 pb-16 md:px-6">
            <AnnouncementBanner />
            <AdminLockBanner />
            {children}
          </main>
        </PageTransition>
      </BottomTabBarProvider>
      <SiteFooter />
      <ScrollToTop />
      <DailyCheckinTrigger />
      <CskhChat />
    </div>
  );
}
