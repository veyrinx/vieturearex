/**
 * Bộ dựng giao diện Discord dùng chung.
 *
 * Không import "server-only": file này còn được dùng bởi bot gateway ở
 * `discord-bot/` (chạy Node thường) qua đường sao chép kiểu dữ liệu, và bởi
 * route interactions chạy trên Vercel.
 *
 * Nguyên tắc trình bày (để mọi tin bot gửi ra trông cùng một nhà):
 *   • Mỗi tin đúng 1 embed, có màu theo ngữ cảnh và footer có tên site.
 *   • Số liệu đi vào `fields` dạng cột, chữ dài đi vào `description`.
 *   • Hành động là nút bấm ở dưới, không bắt người dùng gõ lệnh tiếp.
 *   • Không bao giờ ping @everyone; nhắc ai thì nhắc đúng người/đúng role.
 */

export const BRAND = {
  /** Vàng Arex — dùng cho tin thường. */
  gold: 0xf59e0b,
  green: 0x22c55e,
  red: 0xef4444,
  blue: 0x3b82f6,
  violet: 0x8b5cf6,
  slate: 0x64748b,
  sky: 0x0ea5e9,
} as const;

export type EmbedField = { name: string; value: string; inline?: boolean };

export type Embed = {
  title?: string;
  description?: string;
  url?: string;
  color?: number;
  fields?: EmbedField[];
  author?: { name: string; url?: string; icon_url?: string };
  thumbnail?: { url: string };
  image?: { url: string };
  footer?: { text: string; icon_url?: string };
  timestamp?: string;
};

export type Component = Record<string, unknown>;

export type MessagePayload = {
  content?: string;
  embeds?: Embed[];
  components?: Component[];
  flags?: number;
  allowed_mentions?: { parse?: string[]; users?: string[]; roles?: string[] };
};

/** Chỉ người gọi lệnh nhìn thấy. */
export const EPHEMERAL = 1 << 6;

export const SITE_URL = process.env.AREX_SITE_URL ?? "https://arexnetwork.site";
const FOOTER = "Arex Network · arexnetwork.site";

const LIMIT = { title: 256, desc: 4096, field: 1024, fieldName: 256, footer: 2048 };

function clamp(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

/** Dựng embed đã cắt đúng giới hạn của Discord và gắn sẵn footer + mốc giờ. */
export function embed(input: Embed): Embed {
  return {
    ...input,
    title: input.title ? clamp(input.title, LIMIT.title) : undefined,
    description: input.description ? clamp(input.description, LIMIT.desc) : undefined,
    color: input.color ?? BRAND.gold,
    fields: (input.fields ?? [])
      .filter((f) => f.name && f.value)
      .slice(0, 25)
      .map((f) => ({
        name: clamp(f.name, LIMIT.fieldName),
        value: clamp(f.value, LIMIT.field),
        inline: f.inline ?? false,
      })),
    footer: input.footer ?? { text: FOOTER },
    timestamp: input.timestamp ?? new Date().toISOString(),
  };
}

// ── Thành phần tương tác ────────────────────────────────────────────────────
export const BUTTON_STYLE = {
  primary: 1,
  secondary: 2,
  success: 3,
  danger: 4,
  link: 5,
} as const;

export function row(...components: Component[]): Component {
  return { type: 1, components: components.slice(0, 5) };
}

export function linkButton(label: string, url: string, emoji?: string): Component {
  return {
    type: 2,
    style: BUTTON_STYLE.link,
    label: clamp(label, 80),
    url,
    ...(emoji ? { emoji: { name: emoji } } : {}),
  };
}

export function button(
  customId: string,
  label: string,
  style: keyof typeof BUTTON_STYLE = "secondary",
  emoji?: string,
): Component {
  return {
    type: 2,
    style: BUTTON_STYLE[style],
    label: clamp(label, 80),
    custom_id: customId.slice(0, 100),
    ...(emoji ? { emoji: { name: emoji } } : {}),
  };
}

export function selectMenu(
  customId: string,
  placeholder: string,
  options: { label: string; value: string; description?: string; emoji?: string }[],
): Component {
  return {
    type: 1,
    components: [
      {
        type: 3,
        custom_id: customId.slice(0, 100),
        placeholder: clamp(placeholder, 150),
        options: options.slice(0, 25).map((o) => ({
          label: clamp(o.label, 100),
          value: o.value.slice(0, 100),
          ...(o.description ? { description: clamp(o.description, 100) } : {}),
          ...(o.emoji ? { emoji: { name: o.emoji } } : {}),
        })),
      },
    ],
  };
}

/** Ô nhập 1 dòng / nhiều dòng trong modal. */
export function textInput(input: {
  customId: string;
  label: string;
  style?: "short" | "paragraph";
  placeholder?: string;
  value?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
}): Component {
  return {
    type: 1,
    components: [
      {
        type: 4,
        custom_id: input.customId,
        label: clamp(input.label, 45),
        style: input.style === "paragraph" ? 2 : 1,
        ...(input.placeholder ? { placeholder: clamp(input.placeholder, 100) } : {}),
        ...(input.value ? { value: clamp(input.value, 4000) } : {}),
        required: input.required ?? true,
        ...(input.minLength ? { min_length: input.minLength } : {}),
        ...(input.maxLength ? { max_length: input.maxLength } : {}),
      },
    ],
  };
}

// ── Định dạng ───────────────────────────────────────────────────────────────
export function vnd(amount: number): string {
  return `${Math.round(amount).toLocaleString("vi-VN")}đ`;
}

/** Đồng hồ Discord tự đổi theo múi giờ người xem: <t:1712345678:R> */
export function discordTime(value: string | Date, style: "R" | "f" | "F" | "d" = "f"): string {
  const ms = value instanceof Date ? value.getTime() : Date.parse(value);
  if (!Number.isFinite(ms)) return "—";
  return `<t:${Math.floor(ms / 1000)}:${style}>`;
}

/** Thanh tiến độ bằng ký tự khối — dùng cho trạng thái đơn, giveaway. */
export function progressBar(current: number, total: number, width = 12): string {
  const safeTotal = Math.max(1, total);
  const filled = Math.max(0, Math.min(width, Math.round((current / safeTotal) * width)));
  return `${"▰".repeat(filled)}${"▱".repeat(width - filled)}`;
}

/** Bảng 2 cột gọn cho phần mô tả embed. */
export function keyValueBlock(rows: [string, string][]): string {
  return rows.filter(([, v]) => v).map(([k, v]) => `**${k}:** ${v}`).join("\n");
}
