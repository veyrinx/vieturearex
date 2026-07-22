import "server-only";
import { getSettings } from "@/lib/data/content-service";
import { parsePartners, SETTINGS_KEY_PARTNERS, type Partner } from "@/lib/constants/partners";

export async function getPartners(): Promise<Partner[]> {
  try {
    const settings = await getSettings();
    const row = settings.find((s) => s.key === SETTINGS_KEY_PARTNERS);
    return parsePartners(row?.value ?? null);
  } catch {
    return [];
  }
}
