import {
  mockEvents,
  mockGallery,
  mockNews,
  mockSettings,
  mockUsers,
} from "@/lib/constants/mock-data";
import type {
  ActiveAdminItem,
  AdminActivityLogItem,
  EventItem,
  GalleryItem,
  InvitedEmailItem,
  NewsItem,
  SiteSetting,
  UserItem,
} from "@/lib/types/content";

type Store = {
  events: EventItem[];
  news: NewsItem[];
  gallery: GalleryItem[];
  users: UserItem[];
  settings: SiteSetting[];
  invitedEmails: InvitedEmailItem[];
  activeAdmins: ActiveAdminItem[];
  adminActivityLogs: AdminActivityLogItem[];
};

const globalStore = globalThis as unknown as { __nexusDemoStore?: Store };

if (!globalStore.__nexusDemoStore) {
  globalStore.__nexusDemoStore = {
    events: [...mockEvents],
    news: [...mockNews],
    gallery: [...mockGallery],
    users: [...mockUsers],
    settings: [...mockSettings],
    invitedEmails: [],
    activeAdmins: [],
    adminActivityLogs: [],
  };
}

export function getDemoStore() {
  return globalStore.__nexusDemoStore!;
}
