import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { SiteNavbar } from "@/components/layout/site-navbar";
import { SiteFooter } from "@/components/layout/site-footer";
import { PageTransition } from "@/components/common/page-transition";
import { AutoReload } from "@/components/common/auto-reload";
import { CskhChat } from "@/components/community/cskh-chat";
import { getSettings } from "@/lib/data/content-service";
import { buildSettingsMap } from "@/lib/utils/site-settings";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SiteLayoutProps = {
  children: ReactNode;
};

export default async function SiteLayout({ children }: SiteLayoutProps) {
  const settings = await getSettings();
  const settingsMap = buildSettingsMap(settings);

  if (settingsMap["site.maintenance_mode"] === "true") {
    const supabase = createServerSupabaseClient();
    const adminRoles = ["super_admin", "admin", "manager", "support"];
    let isAdmin = false;
    if (supabase) {
      const { data: { user } } = await supabase.auth.getUser();
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
      />
      <PageTransition>
        <main className="mx-auto w-full max-w-7xl px-4 pb-16 md:px-6">{children}</main>
      </PageTransition>
      <SiteFooter />
      <CskhChat />
    </div>
  );
}
