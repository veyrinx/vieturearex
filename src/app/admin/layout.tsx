import type { Metadata } from "next";
import { ReactNode } from "react";
import { AdminHeartbeat } from "@/components/admin/admin-heartbeat";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { requireAdminAccess } from "@/lib/server/auth";
import { getSettings } from "@/lib/data/content-service";
import { buildSettingsMap } from "@/lib/utils/site-settings";
import { siteConfig } from "@/lib/constants/site";

type AdminLayoutProps = {
  children: ReactNode;
};

export const metadata: Metadata = {
  title: {
    default: "Arex Admin",
    template: "Arex Admin | %s",
  },
  icons: {
    icon: siteConfig.favicon,
    shortcut: siteConfig.favicon,
    apple: siteConfig.favicon,
  },
};

export default async function AdminLayout({ children }: AdminLayoutProps) {
  await requireAdminAccess();
  const settings = await getSettings();
  const settingsMap = buildSettingsMap(settings);

  return (
    <div data-admin-page className="mx-auto flex w-full max-w-7xl items-start gap-4 px-4 py-6 md:px-6">
      <AdminHeartbeat />
      <AdminSidebar logoUrl={settingsMap["branding.logo_light_url"]} />
      <main className="min-w-0 flex-1 space-y-6">{children}</main>
    </div>
  );
}
