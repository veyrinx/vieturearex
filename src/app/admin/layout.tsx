import type { Metadata } from "next";
import { ReactNode } from "react";
import { AdminHeartbeat } from "@/components/admin/admin-heartbeat";
import { AdminCommandPalette } from "@/components/admin/admin-command-palette";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { requireAdminAccess } from "@/lib/server/auth";
import { allowedAdminHrefs, getAdminAccess } from "@/lib/server/admin-access";
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
  const auth = await requireAdminAccess();
  const [settings, activeSite, access] = await Promise.all([
    getSettings(),
    getSiteConfig(),
    getAdminAccess(auth),
  ]);
  const settingsMap = buildSettingsMap(settings, activeSite.id);
  const siteName = settingsMap["branding.site_name"] || activeSite.shortName;
  // Menu chỉ hiện khu vực vai này được cấp. Chốt chặn thật ở middleware.
  const hrefs = allowedAdminHrefs(access);

  return (
    <div data-admin-page className="mx-auto flex w-full max-w-7xl items-start gap-4 px-4 py-6 md:px-6">
      <AdminHeartbeat />
      <AdminSidebar
        logoUrl={settingsMap["branding.logo_light_url"]}
        siteIcon={activeSite.sidebarIcon}
        siteName={siteName}
        allowedHrefs={hrefs}
      />
      <main className="min-w-0 flex-1 space-y-6">{children}</main>
      <AdminCommandPalette allowedHrefs={hrefs} />
    </div>
  );
}
