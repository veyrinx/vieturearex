import { cn } from "@/lib/utils";

export type IconProps = {
  /** Tên Material Symbols (snake_case), vd "home", "local_fire_department". */
  name: string;
  /** Kích thước glyph (px). Material Symbols scale theo font-size. Mặc định 20. */
  size?: number;
  /** true = icon tô đặc (FILL 1). */
  filled?: boolean;
  /** Độ đậm nét 100–700. Mặc định 400. */
  weight?: number;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
};

/**
 * Icon Google Material Symbols (Rounded). Thay cho lucide-react ở phần public.
 * Font nạp 1 lần ở layout; ở đây chỉ render ligature theo `name`.
 */
export function Icon({ name, size = 20, filled = false, weight = 400, className, style, title }: IconProps) {
  return (
    <span
      aria-hidden={title ? undefined : true}
      title={title}
      role={title ? "img" : undefined}
      className={cn("material-symbols-rounded shrink-0 select-none leading-none", className)}
      style={{
        fontSize: size,
        fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' ${weight}, 'GRAD' 0, 'opsz' ${size}`,
        ...style,
      }}
    >
      {name}
    </span>
  );
}
