import { ReactNode } from "react";
import { SiteNavbar } from "@/components/layout/site-navbar";
import { SiteFooter } from "@/components/layout/site-footer";
import { PageTransition } from "@/components/common/page-transition";
import { AutoReload } from "@/components/common/auto-reload";
import { MiniCommunityChat } from "@/components/community/mini-chat";
import { getSettings } from "@/lib/data/content-service";
import { buildSettingsMap } from "@/lib/utils/site-settings";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SiteLayoutProps = {
  children: ReactNode;
};

export default async function SiteLayout({ children }: SiteLayoutProps) {
  const settings = await getSettings();
  const settingsMap = buildSettingsMap(settings);

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
      <MiniCommunityChat />
    </div>
  );
}
