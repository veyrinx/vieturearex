import type { SiteSetting } from "@/lib/types/content";
import { siteConfig, iscConfig } from "@/lib/constants/site";

export const SENSITIVE_CONFIGURED_MASK = "__configured__";

// Keys that are per-site (each domain has its own value stored with "isc:" prefix)
export const SITE_SPECIFIC_SETTING_KEYS = new Set([
  "branding.site_name", "branding.favicon_url", "branding.logo_light_url", "branding.logo_dark_url",
  "seo.default_title", "seo.default_description",
  "home.hero.title",
  "home.background.desktop_urls", "home.background.mobile_urls",
  "home.background.desktop_url", "home.background.mobile_url",
  "home.background.transition_effect", "home.background.interval_seconds", "home.background.transition_seconds",
  "home.events_bg.image_url", "home.events_bg.video_url", "home.events_bg.caption",
  "home.ads.left.image_url", "home.ads.left.link_url",
  "home.ads.right.image_url", "home.ads.right.link_url",
  "social.facebook_url", "social.tiktok_url", "social.youtube_url", "social.email",
  "community.launch_date", "community.facebook_members", "community.youtube_subscribers",
  "community.tiktok_followers", "community.zalo_members",
  "site.description",
]);

export const SENSITIVE_FORM_KEYS = new Set([
  "mail.smtp_pass",
  "mail.smtp_user",
  "mail.smtp_host",
  "mail.from_email",
  "site.discord_webhook",
  "zalo.webhook_url",
  "zalo.group_id",
  "zalo.oa_access_token",
  "zalo.recipient_user_id",
  "ads.google_adsense_id",
  "ads.slot_header",
  "ads.slot_sidebar",
  "ads.slot_article",
  "integrations.lark_webhook_url",
  "integrations.lark_alerts_webhook_url",
  "integrations.telegram_bot_token",
  "integrations.telegram_chat_id",
  "integrations.telegram_user_bot_token",
  "integrations.telegram_user_chat_id",
  "integrations.ai_api_key",
  "integrations.discord_internal_webhook",
  "integrations.discord_public_webhook",
  "integrations.lark_app_id",
  "integrations.lark_app_secret",
  "integrations.lark_sheet_token",
  "tms.payment_info",
  "push.vapid_private_key",
  "streams.youtube_api_key",
]);

export function getConfiguredSensitiveKeys(settings: SiteSetting[]): Set<string> {
  return new Set(
    settings
      .filter((s) => SENSITIVE_FORM_KEYS.has(s.key) && s.value === SENSITIVE_CONFIGURED_MASK)
      .map((s) => s.key),
  );
}

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
  "social.phone",
  "social.zalo_url",
  "social.telegram_url",
  "social.discord_url",
  "community.launch_date",
  "community.facebook_members",
  "community.youtube_subscribers",
  "community.tiktok_followers",
  "community.zalo_members",
  "zalo.webhook_url",
  "zalo.group_id",
  "zalo.oa_access_token",
  "zalo.recipient_user_id",
  "ads.google_adsense_id",
  "ads.slot_header",
  "ads.slot_sidebar",
  "ads.slot_article",
  "tms.free_per_week",
  "tms.payment_price",
  "tms.payment_info",
  "tms.payment_qr_url",
  "site.maintenance_mode",
  "site.maintenance_message",
  "site.maintenance_end_time",
  "site.discord_webhook",
  "integrations.lark_webhook_url",
  "integrations.lark_alerts_webhook_url",
  "integrations.lark_bot_name",
  "integrations.lark_daily_report",
  "integrations.telegram_bot_token",
  "integrations.telegram_chat_id",
  "integrations.telegram_daily_report",
  "integrations.telegram_user_bot_token",
  "integrations.telegram_user_chat_id",
  "integrations.ai_auto_reply",
  "integrations.ai_bot_name",
  "integrations.ai_system_prompt",
  "integrations.ai_api_key",
  "integrations.ai_base_url",
  "integrations.ai_model",
  "integrations.discord_internal_webhook",
  "integrations.discord_public_webhook",
  "integrations.discord_daily_report",
  "integrations.report_schedule_hour",
  "integrations.report_schedule_interval",
  "integrations.report_schedule_days",
  "integrations.telegram_report_hour",
  "integrations.discord_report_hour",
  "integrations.lark_report_hour",
  "integrations.tg_auto_news",
  "integrations.tg_auto_scheduled",
  "integrations.tg_auto_events",
  "integrations.tg_auto_broadcast_dm",
  "integrations.lark_app_id",
  "integrations.lark_app_secret",
  "integrations.lark_sheet_token",
  "integrations.lark_sheet_name",
  "mail.smtp_host",
  "mail.smtp_port",
  "mail.smtp_user",
  "mail.smtp_pass",
  "mail.from_name",
  "mail.from_email",
  "mail.header_image",
  "mail.send_welcome",
  "mail.send_notifications",
  "mail.notify.user_follow",
  "mail.notify.comment_reply",
  "mail.notify.comment_approved",
  "mail.notify.forum_reply",
  "mail.notify.rating_reply",
  "mail.notify.achievement",
  "mail.notify.wiki_approved",
  "mail.notify.registration_approved",
  "content.comments_enabled",
  "content.comments_require_login",
  "content.comments_auto_approve",
  "content.comments_max_length",
  "content.news_per_page",
  "content.featured_count",
  "content.show_view_count",
  "users.registration_enabled",
  "users.require_email_verification",
  "users.google_login_enabled",
  "users.default_avatar_url",
  "users.public_profiles",
  "users.allow_display_name_change",
  "push.enabled",
  "push.vapid_public_key",
  "push.vapid_private_key",
  "push.vapid_email",
  "push.default_title",
  "push.icon_url",
  "push.badge_url",
  "streams.youtube_channel_id",
  "streams.youtube_api_key",
  "streams.auto_featured",
  "streams.show_upcoming",
  "streams.max_displayed",
  "appearance.primary_color",
  "appearance.default_theme",
  "appearance.card_style",
  "appearance.card_show_views",
  "appearance.card_show_category",
  "appearance.show_author",
] as const;

// Recruitment (team join) settings — stored with the "team_join." prefix.
// Kept out of settingsFormFieldOrder (which drives branding/SEO defaults) but
// must be part of the admin settings allowlist so they can be read & saved.
export const teamJoinSettingKeys = [
  "team_join.enabled",
  "team_join.closed_message",
  "team_join.title",
  "team_join.subtitle",
  "team_join.success_message",
  "team_join.terms_text",
  "team_join.violation_text",
  "team_join.role_options",
  "team_join.note_max_length",
  "team_join.require_phone",
  "team_join.show_socials",
] as const;

export const adminSettingsApiKeys = [
  ...settingsFormFieldOrder,
  ...teamJoinSettingKeys,
  "news.categories",
  "events.custom_servers",
  "events.hidden_servers",
  "events.server_logos",
  "permissions.role_capabilities",
  "permissions.custom_roles",
  "tms.free_per_week",
  "tms.payment_price",
  "tms.payment_info",
  "tms.payment_qr_url",
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
  "tms.free_per_week": "4",
  "tms.payment_price": "",
  "tms.payment_info": "",
  "tms.payment_qr_url": "",
  "site.experimental_mode": "false",
  "social.facebook_url": siteConfig.links.facebook,
  "social.tiktok_url": siteConfig.links.tiktok,
  "social.youtube_url": siteConfig.links.youtube,
  "social.email": siteConfig.contactEmail,
  "site.description": siteConfig.description,
  "zalo.webhook_url": "",
  "zalo.group_id": "",
  "zalo.oa_access_token": "",
  "zalo.recipient_user_id": "",
  "ads.google_adsense_id": "",
  "ads.slot_header": "",
  "ads.slot_sidebar": "",
  "ads.slot_article": "",
  "site.maintenance_mode": "false",
  "site.maintenance_message": "Website đang được bảo trì. Vui lòng quay lại sau.",
  "site.maintenance_end_time": "",
  "site.discord_webhook": "",
  "integrations.telegram_bot_token": "",
  "integrations.telegram_chat_id": "",
  "integrations.telegram_daily_report": "true",
  "integrations.report_schedule_hour": "8",
  "integrations.report_schedule_interval": "24",
  "integrations.report_schedule_days": "0,1,2,3,4,5,6",
  "integrations.ai_auto_reply": "true",
  "integrations.ai_bot_name": "Trợ Lý AI",
  "integrations.ai_system_prompt": "",
  "community.launch_date": "",
  "community.facebook_members": "",
  "community.youtube_subscribers": "",
  "community.tiktok_followers": "",
  "community.zalo_members": "",
  "team_join.enabled": "true",
  "team_join.closed_message":
    "Hiện tại team Arex đang tạm dừng nhận đơn tuyển dụng. Vui lòng quay lại sau hoặc theo dõi các kênh chính thức để cập nhật đợt tuyển tiếp theo.",
};

// Default values for ISC Network (site-specific keys only)
export const defaultIscSettingValues: Record<string, string> = {
  "branding.site_name": iscConfig.shortName,
  "branding.favicon_url": iscConfig.favicon,
  "branding.logo_light_url": iscConfig.sidebarIcon,
  "branding.logo_dark_url": iscConfig.favicon,
  "seo.default_title": iscConfig.name,
  "seo.default_description": iscConfig.description,
  "home.hero.title": iscConfig.shortName,
  "home.background.desktop_urls": defaultSiteSettingValues["home.background.desktop_urls"],
  "home.background.mobile_urls": defaultSiteSettingValues["home.background.mobile_urls"],
  "home.background.interval_seconds": "5",
  "home.background.transition_seconds": "1",
  "home.background.transition_effect": "fade",
  "social.facebook_url": iscConfig.links.facebook,
  "social.tiktok_url": iscConfig.links.tiktok,
  "social.youtube_url": iscConfig.links.youtube,
  "social.email": iscConfig.contactEmail,
  "site.description": iscConfig.description,
};

export function isSettingsFormFieldKey(key: string): key is SettingsFormFieldKey {
  return settingsFormFieldKeySet.has(key);
}

export function isAdminSettingsApiKey(key: string): key is AdminSettingsApiKey {
  return adminSettingsApiKeySet.has(key);
}

export function getSettingsFormInitialState(settings: SiteSetting[]) {
  const settingsMap = new Map(settings.map((item) => [item.key, item.value]));
  const state: Record<string, string> = {};

  for (const key of settingsFormFieldOrder) {
    const raw = settingsMap.get(key) ?? defaultSiteSettingValues[key] ?? "";
    state[key] = raw === SENSITIVE_CONFIGURED_MASK ? "" : raw;
  }

  // ISC-prefixed versions of site-specific keys
  for (const key of settingsFormFieldOrder) {
    if (!SITE_SPECIFIC_SETTING_KEYS.has(key)) continue;
    const iscKey = `isc:${key}`;
    const raw = settingsMap.get(iscKey) ?? defaultIscSettingValues[key] ?? defaultSiteSettingValues[key] ?? "";
    state[iscKey] = raw === SENSITIVE_CONFIGURED_MASK ? "" : raw;
  }

  // Recruitment (team join) keys — not part of settingsFormFieldOrder.
  for (const key of teamJoinSettingKeys) {
    state[key] = settingsMap.get(key) ?? defaultSiteSettingValues[key] ?? "";
  }

  return state;
}

export function buildSettingsMap(settings: SiteSetting[], siteId?: string) {
  const base: Record<string, string> = siteId === "isc"
    ? { ...defaultSiteSettingValues, ...defaultIscSettingValues }
    : { ...defaultSiteSettingValues };

  for (const item of settings) {
    if (item.key.includes(":")) continue;
    if (siteId === "isc" && SITE_SPECIFIC_SETTING_KEYS.has(item.key)) continue;
    base[item.key] = item.value;
  }

  if (siteId === "isc") {
    for (const item of settings) {
      if (item.key.startsWith("isc:")) {
        base[item.key.slice(4)] = item.value;
      }
    }
  }

  return base;
}

export function resolveSocialLinks(settingsMap: Record<string, string>, siteId?: string) {
  const fallback = siteId === "isc" ? iscConfig : siteConfig;
  return {
    facebook: settingsMap["social.facebook_url"] || fallback.links.facebook,
    tiktok: settingsMap["social.tiktok_url"] || fallback.links.tiktok,
    youtube: settingsMap["social.youtube_url"] || fallback.links.youtube,
    email: settingsMap["social.email"] || fallback.contactEmail,
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

export function resolveCommunityStats(settingsMap: Record<string, string>) {
  const launchDate = settingsMap["community.launch_date"];
  const daysActive = launchDate
    ? Math.max(0, Math.floor((Date.now() - new Date(launchDate).getTime()) / 86_400_000))
    : null;
  return {
    daysActive,
    facebookMembers: settingsMap["community.facebook_members"] || null,
    youtubeSubscribers: settingsMap["community.youtube_subscribers"] || null,
    tiktokFollowers: settingsMap["community.tiktok_followers"] || null,
    zaloMembers: settingsMap["community.zalo_members"] || null,
  };
}

export function resolveTeamJoinSettings(settingsMap: Record<string, string>) {
  const rawRoles = settingsMap["team_join.role_options"];
  const defaults = [
    "Caster / Bình luận viên",
    "Editor video",
    "Designer / Đồ hoạ",
    "Content writer",
    "Mod / Quản trị viên cộng đồng",
    "Streamer",
    "Photographer",
    "Marketing",
    "Khác",
  ];
  const roleOptions = (rawRoles ? rawRoles.split(/\r?\n|,/) : [])
    .map((s) => s.trim())
    .filter(Boolean);
  return {
    enabled: settingsMap["team_join.enabled"] !== "false", // default on
    closedMessage:
      settingsMap["team_join.closed_message"] ||
      "Hiện tại team Arex đang tạm dừng nhận đơn tuyển dụng. Vui lòng quay lại sau.",
    title: settingsMap["team_join.title"] || "Tham gia team Arex",
    subtitle:
      settingsMap["team_join.subtitle"] ||
      "Điền thông tin bên dưới. Bộ phận IT sẽ duyệt hồ sơ và gửi email kích hoạt cho bạn — không cần đặt mật khẩu ngay tại đây.",
    successMessage:
      settingsMap["team_join.success_message"] ||
      "Cảm ơn bạn! Bộ phận IT đã nhận hồ sơ và sẽ liên hệ qua email sau khi duyệt (kèm link đặt mật khẩu).",
    roleOptions: roleOptions.length > 0 ? roleOptions : defaults,
    requirePhone: settingsMap["team_join.require_phone"] === "true",
    showSocials: settingsMap["team_join.show_socials"] !== "false", // default on
    termsText:
      settingsMap["team_join.terms_text"] ||
      "Khi tham gia team Arex, bạn cam kết: tôn trọng cộng đồng, không phát ngôn thù ghét/spam, không tiết lộ thông tin nội bộ, tuân thủ quy định Garena Free Fire và pháp luật Việt Nam.",
    violationText:
      settingsMap["team_join.violation_text"] ||
      "Nếu vi phạm sẽ bị: cảnh cáo lần 1, tước quyền thành viên lần 2, ban vĩnh viễn + công khai vi phạm trên kênh chính thức nếu nghiêm trọng.",
    noteMaxLength:
      Math.max(50, Math.min(2000, Number.parseInt(settingsMap["team_join.note_max_length"] || "500", 10) || 500)),
  };
}

export type TeamJoinConfig = ReturnType<typeof resolveTeamJoinSettings>;

export function resolveEventsBackdrop(settingsMap: Record<string, string>) {
  return {
    imageUrl: settingsMap["home.events_bg.image_url"] || "",
    videoUrl: settingsMap["home.events_bg.video_url"] || "",
    caption: settingsMap["home.events_bg.caption"] || "",
  };
}

export function resolveHomeSideAds(settingsMap: Record<string, string>) {
  return {
    left: {
      image: settingsMap["home.ads.left.image_url"] || null,
      link: settingsMap["home.ads.left.link_url"] || null,
    },
    right: {
      image: settingsMap["home.ads.right.image_url"] || null,
      link: settingsMap["home.ads.right.link_url"] || null,
    },
  };
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
