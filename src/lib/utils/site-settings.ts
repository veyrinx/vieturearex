import type { SiteSetting } from "@/lib/types/content";
import { siteConfig } from "@/lib/constants/site";

export type HeroSliderEffect = "fade" | "zoom" | "slide" | "drift" | "cinematic";
export const settingsFormFieldOrder = [
  "branding.site_name",
  "branding.favicon_url",
  "branding.logo_light_url",
  "branding.logo_dark_url",
  "seo.default_title",
  "seo.default_description",
  "home.hero.title",
  "home.background.desktop_urls",
  "home.background.mobile_urls",
  "home.background.transition_effect",
  "home.background.interval_seconds",
  "home.background.transition_seconds",
  "social.facebook_url",
  "social.tiktok_url",
  "social.youtube_url",
  "social.email",
  "zalo.webhook_url",
  "zalo.group_id",
  "ads.google_adsense_id",
  "ads.slot_header",
  "ads.slot_sidebar",
  "ads.slot_article",
] as const;

export const adminSettingsApiKeys = [
  ...settingsFormFieldOrder,
  "news.categories",
] as const;

export type SettingsFormFieldKey = (typeof settingsFormFieldOrder)[number];
export type AdminSettingsApiKey = (typeof adminSettingsApiKeys)[number];

const settingsFormFieldKeySet = new Set<string>(settingsFormFieldOrder);
const adminSettingsApiKeySet = new Set<string>(adminSettingsApiKeys);

export const defaultSiteSettingValues: Record<string, string> = {
  "branding.site_name": siteConfig.shortName,
  "branding.favicon_url": siteConfig.favicon,
  "branding.logo_light_url": siteConfig.sidebarIcon,
  "branding.logo_dark_url": siteConfig.favicon,
  "seo.default_title": siteConfig.name,
  "seo.default_description": siteConfig.description,
  "home.hero.title": "Arex",
  "home.background.desktop_urls":
    "https://dl.dir.freefiremobile.com/common/web_event/official2.ff.garena.all/20263/697b5d2e34ac088f5b5a4427d57f6281.jpg",
  "home.background.mobile_urls":
    "https://dl.dir.freefiremobile.com/common/web_event/official2.ff.garena.all/20263/0680c1792156b8a80095c669520f019a.jpg",
  "home.background.interval_seconds": "5",
  "home.background.transition_seconds": "1",
  "home.background.transition_effect": "fade",
  "home.background.desktop_url":
    "https://dl.dir.freefiremobile.com/common/web_event/official2.ff.garena.all/20263/697b5d2e34ac088f5b5a4427d57f6281.jpg",
  "home.background.mobile_url":
    "https://dl.dir.freefiremobile.com/common/web_event/official2.ff.garena.all/20263/0680c1792156b8a80095c669520f019a.jpg",
  "site.experimental_mode": "false",
  "social.facebook_url": siteConfig.links.facebook,
  "social.tiktok_url": siteConfig.links.tiktok,
  "social.youtube_url": siteConfig.links.youtube,
  "social.email": siteConfig.contactEmail,
  "site.description": siteConfig.description,
  "zalo.webhook_url": "",
  "zalo.group_id": "",
  "ads.google_adsense_id": "",
  "ads.slot_header": "",
  "ads.slot_sidebar": "",
  "ads.slot_article": "",
};

export function isSettingsFormFieldKey(key: string): key is SettingsFormFieldKey {
  return settingsFormFieldKeySet.has(key);
}

export function isAdminSettingsApiKey(key: string): key is AdminSettingsApiKey {
  return adminSettingsApiKeySet.has(key);
}

export function getSettingsFormInitialState(settings: SiteSetting[]) {
  const settingsMap = new Map(settings.map((item) => [item.key, item.value]));

  return settingsFormFieldOrder.reduce<Record<SettingsFormFieldKey, string>>((acc, key) => {
    acc[key] = settingsMap.get(key) ?? defaultSiteSettingValues[key] ?? "";
    return acc;
  }, {} as Record<SettingsFormFieldKey, string>);
}

export function buildSettingsMap(settings: SiteSetting[]) {
  return settings.reduce<Record<string, string>>((acc, item) => {
    acc[item.key] = item.value;
    return acc;
  }, { ...defaultSiteSettingValues });
}

export function resolveSocialLinks(settingsMap: Record<string, string>) {
  return {
    facebook: settingsMap["social.facebook_url"] || siteConfig.links.facebook,
    tiktok: settingsMap["social.tiktok_url"] || siteConfig.links.tiktok,
    youtube: settingsMap["social.youtube_url"] || siteConfig.links.youtube,
    email: settingsMap["social.email"] || siteConfig.contactEmail,
  };
}

function parseSliderImages(rawValue?: string) {
  return (rawValue ?? "")
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 3);
}

function parseSeconds(rawValue: string | undefined, fallback: number, min: number, max: number) {
  const parsed = Number.parseFloat(rawValue ?? "");
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, parsed));
}

export function resolveHeroSliderSettings(settingsMap: Record<string, string>) {
  const desktopImages =
    parseSliderImages(settingsMap["home.background.desktop_urls"]).length > 0
      ? parseSliderImages(settingsMap["home.background.desktop_urls"])
      : parseSliderImages(settingsMap["home.background.desktop_url"]);

  const mobileImages =
    parseSliderImages(settingsMap["home.background.mobile_urls"]).length > 0
      ? parseSliderImages(settingsMap["home.background.mobile_urls"])
      : parseSliderImages(settingsMap["home.background.mobile_url"]);

  const effect = settingsMap["home.background.transition_effect"];
  const transitionEffect: HeroSliderEffect =
    effect === "zoom" ||
      effect === "slide" ||
      effect === "drift" ||
      effect === "cinematic" ||
      effect === "fade"
      ? effect
      : "fade";

  return {
    desktopImages,
    mobileImages: mobileImages.length > 0 ? mobileImages : desktopImages,
    intervalMs: parseSeconds(settingsMap["home.background.interval_seconds"], 5, 2, 30) * 1000,
    transitionMs: parseSeconds(settingsMap["home.background.transition_seconds"], 1, 0.4, 5) * 1000,
    transitionEffect,
  };
}
