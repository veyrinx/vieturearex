"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface PlatformIconProps {
  ios: string;
  android: string;
  material?: string;
  className?: string;
  size?: number;
  "aria-label"?: string;
}

const ICON_MAP_IOS: Record<string, string> = {
  home: "house.fill",
  news: "newspaper.fill",
  events: "calendar.badge.clock.fill",
  live: "play.rectangle.fill",
  tournaments: "trophy.fill",
  shop: "bag.fill",
  community: "person.3.fill",
  tools: "wrench.and.screwdriver.fill",
  quiz: "questionmark.circle.fill",
  wiki: "book.fill",
  items: "square.grid.2x2.fill",
  players: "crown.fill",
  prime: "star.fill",
  tiktok: "music.note.list",
  team: "person.2.fill",
  about: "info.circle.fill",
  contact: "envelope.fill",
  search: "magnifyingglass",
  profile: "person.circle.fill",
  notifications: "bell.fill",
  settings: "gearshape.fill",
  theme: "circle.lefthalf.filled",
  menu: "line.3.horizontal",
  close: "xmark",
  chevronDown: "chevron.down",
  chevronUp: "chevron.up",
  chevronLeft: "chevron.left",
  chevronRight: "chevron.right",
  check: "checkmark",
  bookmark: "bookmark.fill",
  share: "square.and.arrow.up",
  externalLink: "arrow.up.right.square.fill",
  refresh: "arrow.clockwise",
  loader: "arrow.clockwise",
  error: "exclamationmark.triangle.fill",
  warning: "exclamationmark.triangle.fill",
  success: "checkmark.circle.fill",
  info: "info.circle.fill",
  user: "person.fill",
  users: "person.3.fill",
  message: "message.fill",
  mail: "envelope.fill",
  phone: "phone.fill",
  location: "location.fill",
  calendar: "calendar.fill",
  clock: "clock.fill",
  timer: "timer",
  flame: "flame.fill",
  sparkles: "sparkles",
  trophy: "trophy.fill",
  crown: "crown.fill",
  shield: "shield.fill",
  sword: "sword.fill",
  heart: "heart.fill",
  star: "star.fill",
  gem: "diamond.fill",
  download: "arrow.down.circle.fill",
  upload: "arrow.up.circle.fill",
  copy: "doc.on.doc.fill",
  link: "link",
  play: "play.fill",
  pause: "pause.fill",
  stop: "stop.fill",
  forward: "forward.fill",
  backward: "backward.fill",
  volume: "speaker.wave.2.fill",
  mute: "speaker.slash.fill",
  fullscreen: "arrow.up.left.and.arrow.down.right",
  minimize: "arrow.down.right.and.arrow.up.left",
  expand: "arrow.up.left.and.arrow.down.right",
  compress: "arrow.down.right.and.arrow.up.left",
  grid: "square.grid.2x2.fill",
  list: "list.bullet",
  filter: "line.3.horizontal.decrease.circle.fill",
  sort: "arrow.up.arrow.down",
  more: "ellipsis.circle.fill",
  edit: "pencil.fill",
  delete: "trash.fill",
  add: "plus.circle.fill",
  remove: "minus.circle.fill",
  save: "square.and.arrow.down.fill",
  cancel: "xmark.circle.fill",
  confirm: "checkmark.circle.fill",
  back: "chevron.left",
  forwardIcon: "chevron.right",
  up: "chevron.up",
  down: "chevron.down",
  left: "chevron.left",
  right: "chevron.right",
  homeOutline: "house",
  newsOutline: "newspaper",
  eventsOutline: "calendar.badge.clock",
  liveOutline: "play.rectangle",
  tournamentsOutline: "trophy",
  shopOutline: "bag",
  communityOutline: "person.3",
  toolsOutline: "wrench.and.screwdriver",
  quizOutline: "questionmark.circle",
  wikiOutline: "book",
  itemsOutline: "square.grid.2x2",
  playersOutline: "crown",
  primeOutline: "star",
  tiktokOutline: "music.note.list",
  profileOutline: "person.circle",
  notificationsOutline: "bell",
  settingsOutline: "gearshape",
  themeOutline: "circle.lefthalf.filled",
  searchOutline: "magnifyingglass",
};

const ICON_MAP_ANDROID: Record<string, string> = {
  home: "home",
  news: "article",
  events: "event",
  live: "live_tv",
  tournaments: "emoji_events",
  shop: "shopping_bag",
  community: "groups",
  tools: "build",
  quiz: "quiz",
  wiki: "menu_book",
  items: "grid_view",
  players: "leaderboard",
  prime: "star_rate",
  tiktok: "music_video",
  team: "group",
  about: "info",
  contact: "contact_mail",
  search: "search",
  profile: "account_circle",
  notifications: "notifications",
  settings: "settings",
  theme: "dark_mode",
  menu: "menu",
  close: "close",
  chevronDown: "expand_more",
  chevronUp: "expand_less",
  chevronLeft: "chevron_left",
  chevronRight: "chevron_right",
  check: "check",
  bookmark: "bookmark",
  share: "share",
  externalLink: "open_in_new",
  refresh: "refresh",
  loader: "refresh",
  error: "error",
  warning: "warning",
  success: "check_circle",
  info: "info",
  user: "person",
  users: "people",
  message: "chat",
  mail: "email",
  phone: "phone",
  location: "location_on",
  calendar: "calendar_today",
  clock: "schedule",
  timer: "timer",
  flame: "local_fire_department",
  sparkles: "auto_awesome",
  trophy: "workspace_premium",
  crown: "diamond",
  shield: "security",
  sword: "sports_mma",
  heart: "favorite",
  star: "star",
  gem: "diamond",
  download: "file_download",
  upload: "file_upload",
  copy: "content_copy",
  link: "link",
  play: "play_arrow",
  pause: "pause",
  stop: "stop",
  forward: "fast_forward",
  backward: "fast_rewind",
  volume: "volume_up",
  mute: "volume_off",
  fullscreen: "fullscreen",
  minimize: "fullscreen_exit",
  expand: "fullscreen",
  compress: "fullscreen_exit",
  grid: "grid_view",
  list: "list",
  filter: "filter_list",
  sort: "sort",
  more: "more_vert",
  edit: "edit",
  delete: "delete",
  add: "add_circle",
  remove: "remove_circle",
  save: "save",
  cancel: "cancel",
  confirm: "done",
  back: "arrow_back",
  forwardIcon: "arrow_forward",
  up: "keyboard_arrow_up",
  down: "keyboard_arrow_down",
  left: "keyboard_arrow_left",
  right: "keyboard_arrow_right",
  homeOutline: "home_outlined",
  newsOutline: "article_outlined",
  eventsOutline: "event_outlined",
  liveOutline: "live_tv_outlined",
  tournamentsOutline: "emoji_events_outlined",
  shopOutline: "shopping_bag_outlined",
  communityOutline: "groups_outlined",
  toolsOutline: "build_outlined",
  quizOutline: "quiz_outlined",
  wikiOutline: "menu_book_outlined",
  itemsOutline: "grid_view_outlined",
  playersOutline: "leaderboard_outlined",
  primeOutline: "star_rate_outlined",
  tiktokOutline: "music_video_outlined",
  profileOutline: "account_circle_outlined",
  notificationsOutline: "notifications_outlined",
  settingsOutline: "settings_outlined",
  themeOutline: "dark_mode_outlined",
  searchOutline: "search_outlined",
};

export function PlatformIcon({
  ios,
  android,
  material,
  className,
  size = 24,
  "aria-label": ariaLabel,
}: PlatformIconProps) {
  const [platform, setPlatform] = useState<"ios" | "android" | "web">("web");

  useEffect(() => {
    const ua = navigator.userAgent;
    if (/ArexIOS/.test(ua)) setPlatform("ios");
    else if (/ArexAndroid/.test(ua)) setPlatform("android");
    else setPlatform("web");
  }, []);

  const iconName = platform === "ios" ? ios : android;

  if (platform === "ios") {
    return (
      <span
        className={cn("inline-flex items-center justify-center", className)}
        style={{ fontSize: size, lineHeight: 1 }}
        aria-label={ariaLabel}
        role="img"
      >
        <span className="material-symbols-rounded" style={{ fontSize: size, fontVariationSettings: "'FILL' 1" }}>
          {ICON_MAP_IOS[iconName] || iconName}
        </span>
      </span>
    );
  }

  return (
    <span
      className={cn("inline-flex items-center justify-center", className)}
      style={{ fontSize: size, lineHeight: 1 }}
      aria-label={ariaLabel}
      role="img"
    >
      <span className="material-symbols-rounded" style={{ fontSize: size, fontVariationSettings: "'FILL' 1" }}>
        {ICON_MAP_ANDROID[iconName] || material || iconName}
      </span>
    </span>
  );
}

export function PlatformIconButton({
  ios,
  android,
  material,
  children,
  className,
  size = 24,
  "aria-label": ariaLabel,
  ...props
}: PlatformIconProps & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const [platform, setPlatform] = useState<"ios" | "android" | "web">("web");

  useEffect(() => {
    const ua = navigator.userAgent;
    if (/ArexIOS/.test(ua)) setPlatform("ios");
    else if (/ArexAndroid/.test(ua)) setPlatform("android");
    else setPlatform("web");
  }, []);

  const iconName = platform === "ios" ? ios : android;

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-xl transition-colors",
        className
      )}
      style={{ width: size + 8, height: size + 8 }}
      aria-label={ariaLabel}
      {...props}
    >
      {platform === "ios" ? (
        <span className="material-symbols-rounded" style={{ fontSize: size, fontVariationSettings: "'FILL' 1" }}>
          {ICON_MAP_IOS[iconName] || iconName}
        </span>
      ) : (
        <span className="material-symbols-rounded" style={{ fontSize: size, fontVariationSettings: "'FILL' 1" }}>
          {ICON_MAP_ANDROID[iconName] || material || iconName}
        </span>
      )}
      {children}
    </button>
  );
}

export const TAB_ICONS = {
  home: { ios: "home", android: "home" },
  news: { ios: "news", android: "news" },
  events: { ios: "events", android: "events" },
  community: { ios: "community", android: "community" },
  profile: { ios: "profile", android: "profile" },
} as const;