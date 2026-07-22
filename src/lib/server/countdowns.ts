import "server-only";
import { getSettings } from "@/lib/data/content-service";
import {
  parseCountdowns,
  DEFAULT_COUNTDOWNS,
  SETTINGS_KEY_COUNTDOWNS,
  type FFCountdown,
} from "@/lib/constants/countdowns";

/**
 * Mốc đếm ngược. Chưa cấu hình → dùng mẫu mặc định để trang không trống.
 */
export async function getCountdowns(): Promise<FFCountdown[]> {
  try {
    const settings = await getSettings();
    const row = settings.find((s) => s.key === SETTINGS_KEY_COUNTDOWNS);
    const parsed = parseCountdowns(row?.value ?? null);
    return parsed.length > 0 ? parsed : DEFAULT_COUNTDOWNS;
  } catch {
    return DEFAULT_COUNTDOWNS;
  }
}
