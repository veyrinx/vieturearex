import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { SiteNavbar } from "@/components/layout/site-navbar";
import { SiteFooter } from "@/components/layout/site-footer";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { PageTransition } from "@/components/common/page-transition";
import { AutoReload } from "@/components/common/auto-reload";
import { AutoTranslate } from "@/components/common/auto-translate";
import { AnnouncementBar } from "@/components/layout/announcement-bar";
import { AnnouncementBanner } from "@/components/common/announcement-banner";
import { ScrollToTop } from "@/components/common/scroll-to-top";
import { getSettings } from "@/lib/data/content-service";
import { buildSettingsMap } from "@/lib/utils/site-settings";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSiteConfig } from "@/lib/server/get-site-config";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
    <div
      className="relative min-h-screen"
      style={{ paddingTop: "var(--banner-h, 0px)", transition: "padding-top 0.22s cubic-bezier(0.4,0,0.2,1)" }}
    >
      <AnnouncementBar />
      <AutoReload />
      <SiteNavbar
        logoLight={settingsMap["branding.logo_light_url"]}
        logoDark={settingsMap["branding.logo_dark_url"]}
        siteName={settingsMap["branding.site_name"] || activeSite.shortName}
      />
      <AnnouncementBanner />
      <PageTransition>
        <main className="mx-auto w-full max-w-7xl px-4 pb-28 md:pb-16 md:px-6">{children}</main>
      </PageTransition>
      <SiteFooter />
      <MobileBottomNav />
      <ScrollToTop />
      <AutoTranslate />
    </div>
  );
}
