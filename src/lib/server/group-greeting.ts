import "server-only";
import { getSettings } from "@/lib/data/content-service";
import { siteConfig } from "@/lib/constants/site";

/**
 * Lời chào khi có người vào nhóm và lời tiễn khi có người rời — dùng chung cho
 * cả nhóm Zalo lẫn Telegram. Một bộ chữ cho cả hai: quản trị viên chỉ phải sửa
 * một chỗ, và hai nhóm cũng nên nói giống nhau.
 */

export const GROUP_WELCOME_ENABLED_KEY = "integrations.group_welcome_enabled";
export const GROUP_WELCOME_TEXT_KEY = "integrations.group_welcome_text";
export const GROUP_FAREWELL_ENABLED_KEY = "integrations.group_farewell_enabled";
export const GROUP_FAREWELL_TEXT_KEY = "integrations.group_farewell_text";

export const DEFAULT_WELCOME_TEXT =
  "👋 Chào {name} đã vào nhóm!\n\n" +
  "Gõ `help` để xem bot làm được gì, `diemdanh` để điểm danh nhận điểm.\n" +
  "🔗 {site}";

export const DEFAULT_FAREWELL_TEXT = "🙋 {name} vừa rời nhóm. Hẹn gặp lại!";

/** Cờ bật/tắt: chưa đặt bao giờ thì coi như BẬT, khỏi phải vào cấu hình mới dùng được. */
function isOn(value: string | undefined): boolean {
  if (value === undefined || value.trim() === "") return true;
  return value !== "0" && value.toLowerCase() !== "false";
}

/** {name} → tên người, {group} → tên nhóm, {site} → địa chỉ site. */
export function renderGreeting(template: string, name: string, group = ""): string {
  return render(template, name, group);
}

function render(template: string, name: string, group: string): string {
  return template
    .replaceAll("{name}", name || "bạn")
    .replaceAll("{group}", group || "nhóm")
    .replaceAll("{site}", siteConfig.url)
    .trim();
}

export type GroupGreeting = { welcome: string | null; farewell: string | null };

/**
 * Trả về câu chào/tiễn đã thay chỗ trống, hoặc null khi bị tắt. Đọc settings
 * MỘT lần cho cả hai để mỗi lượt có người ra vào không phải hỏi DB hai bận.
 */
export async function getGroupGreetings(name: string, group = ""): Promise<GroupGreeting> {
  const settings = await getSettings().catch(() => []);
  const get = (key: string) => settings.find((s) => s.key === key)?.value;

  const welcomeOn = isOn(get(GROUP_WELCOME_ENABLED_KEY));
  const farewellOn = isOn(get(GROUP_FAREWELL_ENABLED_KEY));
  const welcomeText = get(GROUP_WELCOME_TEXT_KEY)?.trim() || DEFAULT_WELCOME_TEXT;
  const farewellText = get(GROUP_FAREWELL_TEXT_KEY)?.trim() || DEFAULT_FAREWELL_TEXT;

  return {
    welcome: welcomeOn ? render(welcomeText, name, group) : null,
    farewell: farewellOn ? render(farewellText, name, group) : null,
  };
}

/** Chữ đang lưu + trạng thái bật/tắt — cho nút "Gửi thử" trong Admin. */
export async function getGroupGreetingConfig(): Promise<{
  welcomeOn: boolean;
  farewellOn: boolean;
  welcomeText: string;
  farewellText: string;
}> {
  const settings = await getSettings().catch(() => []);
  const get = (key: string) => settings.find((s) => s.key === key)?.value;
  return {
    welcomeOn: isOn(get(GROUP_WELCOME_ENABLED_KEY)),
    farewellOn: isOn(get(GROUP_FAREWELL_ENABLED_KEY)),
    welcomeText: get(GROUP_WELCOME_TEXT_KEY)?.trim() || DEFAULT_WELCOME_TEXT,
    farewellText: get(GROUP_FAREWELL_TEXT_KEY)?.trim() || DEFAULT_FAREWELL_TEXT,
  };
}
