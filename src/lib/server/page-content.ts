import "server-only";
import { getSettings } from "@/lib/data/content-service";
import {
  parsePageContents,
  SETTINGS_KEY_PAGES,
  type PageContent,
} from "@/lib/constants/page-content";

export async function getPageContents(): Promise<PageContent[]> {
  try {
    const settings = await getSettings();
    const row = settings.find((s) => s.key === SETTINGS_KEY_PAGES);
    return parsePageContents(row?.value ?? null);
  } catch {
    return [];
  }
}

/**
 * Nội dung admin đặt cho 1 trang. Trả null khi chưa cấu hình / bị tắt / rỗng
 * → trang dùng nội dung mặc định viết sẵn trong code.
 */
export async function getPageBody(key: string): Promise<string | null> {
  const found = (await getPageContents()).find((p) => p.key === key);
  if (!found || found.enabled === false) return null;
  return found.body.trim() ? found.body : null;
}
