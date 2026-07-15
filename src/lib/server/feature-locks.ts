import "server-only";
import { getSettings } from "@/lib/data/content-service";
import {
  parseFeatureLocks,
  SETTINGS_KEY_FEATURE_LOCKS,
  type FeatureLock,
} from "@/lib/constants/feature-locks";

// Đọc danh sách khóa chức năng từ settings (getSettings đã cache theo request).
export async function getFeatureLocks(): Promise<FeatureLock[]> {
  try {
    const settings = await getSettings();
    const row = settings.find((s) => s.key === SETTINGS_KEY_FEATURE_LOCKS);
    return parseFeatureLocks(row?.value ?? null);
  } catch {
    return [];
  }
}
