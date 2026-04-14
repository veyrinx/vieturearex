import { formatISO, subDays } from "date-fns";
import type {
  EventItem,
  GalleryItem,
  NewsItem,
  SiteSetting,
  UserItem,
} from "@/lib/types/content";

const now = new Date();

function toVietnamIso(value: string) {
  return new Date(`${value}T00:00:00+07:00`).toISOString();
}

export const mockEvents: EventItem[] = []; // Đã xoá toàn bộ dữ liệu mẫu, chỉ giữ cấu hình sạch để tránh test data cũ.

export const mockNews: NewsItem[] = [];

export const mockGallery: GalleryItem[] = [];

export const mockUsers: UserItem[] = [];

export const mockSettings: SiteSetting[] = [
  {
    id: "stg-1",
    key: "home.hero.title",
    value: "Arex",
    updated_at: formatISO(subDays(now, 1)),
  },
  {
    id: "stg-2",
    key: "home.background.desktop_urls",
    value:
      "https://dl.dir.freefiremobile.com/common/web_event/official2.ff.garena.all/20263/697b5d2e34ac088f5b5a4427d57f6281.jpg",
    updated_at: formatISO(subDays(now, 1)),
  },
  {
    id: "stg-3",
    key: "home.background.mobile_urls",
    value:
      "https://dl.dir.freefiremobile.com/common/web_event/official2.ff.garena.all/20263/0680c1792156b8a80095c669520f019a.jpg",
    updated_at: formatISO(subDays(now, 1)),
  },
  {
    id: "stg-4",
    key: "home.background.interval_seconds",
    value: "5",
    updated_at: formatISO(subDays(now, 1)),
  },
  {
    id: "stg-5",
    key: "home.background.transition_seconds",
    value: "1",
    updated_at: formatISO(subDays(now, 1)),
  },
  {
    id: "stg-6",
    key: "home.background.transition_effect",
    value: "fade",
    updated_at: formatISO(subDays(now, 1)),
  },
  {
    id: "stg-7",
    key: "seo.default_title",
    value: "Arex",
    updated_at: formatISO(subDays(now, 1)),
  },
  {
    id: "stg-8",
    key: "analytics.views",
    value: "0",
    updated_at: formatISO(subDays(now, 1)),
  },
  {
    id: "stg-9",
    key: "social.email",
    value: "admin@arex.tech",
    updated_at: formatISO(subDays(now, 1)),
  },
  {
    id: "stg-10",
    key: "news.categories",
    value: "ESPORTS\nPATCH NOTE\nCỘNG ĐỒNG",
    updated_at: formatISO(subDays(now, 1)),
  },
];
