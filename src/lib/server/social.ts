import "server-only";
import { getSettings } from "@/lib/data/content-service";
import { parseSocialVideos, SETTINGS_KEY_SOCIAL, type SocialVideo } from "@/lib/constants/social";

export async function getSocialVideos(): Promise<SocialVideo[]> {
  try {
    const settings = await getSettings();
    const row = settings.find((s) => s.key === SETTINGS_KEY_SOCIAL);
    return parseSocialVideos(row?.value ?? null);
  } catch {
    return [];
  }
}
