import type { Metadata } from "next";
import { ReactNode } from "react";
import { AdminHeartbeat } from "@/components/admin/admin-heartbeat";
import { IconLibraryFab } from "@/components/tools/icon-library-fab";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { requireAdminAccess } from "@/lib/server/auth";
import { getSettings } from "@/lib/data/content-service";
import { buildSettingsMap } from "@/lib/utils/site-settings";
import { getSiteConfig } from "@/lib/server/get-site-config";

export const dynamic = "force-dynamic";

type AdminLayoutProps = {
  children: ReactNode;
};

export async function generateMetadata(): Promise<Metadata> {
  const [settings, activeSite] = await Promise.all([getSettings(), getSiteConfig()]);
  const settingsMap = buildSettingsMap(settings, activeSite.id);
  const shortName = settingsMap["branding.site_name"] || activeSite.shortName;
  const favicon = settingsMap["branding.favicon_url"] || settingsMap["branding.logo_light_url"] || activeSite.favicon;
  return {
    title: {
      default: `${shortName} Admin`,
      template: `${shortName} Admin | %s`,
    },
    icons: {
      icon: favicon,
      shortcut: favicon,
      apple: favicon,
    },
  };
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  await requireAdminAccess();
  const [settings, activeSite] = await Promise.all([getSettings(), getSiteConfig()]);
  const settingsMap = buildSettingsMap(settings, activeSite.id);
  const siteName = settingsMap["branding.site_name"] || activeSite.shortName;

  return (
    <div data-admin-page className="mx-auto flex w-full max-w-7xl items-start gap-4 px-4 py-6 md:px-6">
      <AdminHeartbeat />
      <AdminSidebar
        logoUrl={settingsMap["branding.logo_light_url"]}
        siteIcon={activeSite.sidebarIcon}
        siteName={siteName}
      />
      <main className="min-w-0 flex-1 space-y-6">{children}</main>
      <IconLibraryFab />
    </div>
  );
}
