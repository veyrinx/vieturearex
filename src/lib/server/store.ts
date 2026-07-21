import "server-only";
import { getSettings } from "@/lib/data/content-service";
import {
  parsePrimeItems,
  DEFAULT_PRIME_ITEMS,
  SETTINGS_KEY_PRIME,
  type PrimeItem,
} from "@/lib/constants/store";

/**
 * Danh sách gói Prime. Nếu admin chưa cấu hình → dùng mẫu mặc định để trang
 * công khai không trống.
 */
export async function getPrimeItems(): Promise<PrimeItem[]> {
  try {
    const settings = await getSettings();
    const row = settings.find((s) => s.key === SETTINGS_KEY_PRIME);
    const parsed = parsePrimeItems(row?.value ?? null);
    return parsed.length > 0 ? parsed : DEFAULT_PRIME_ITEMS;
  } catch {
    return DEFAULT_PRIME_ITEMS;
  }
}
