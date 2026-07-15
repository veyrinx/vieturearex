import type { CSSProperties } from "react";

// Icon Google (Material Symbols Rounded) dùng cho Mini App Telegram.
// Font được nạp ở tg/layout.tsx. Tên icon = ligature, vd <Mi name="home" />.
export function Mi({
  name,
  size = 24,
  fill = 0,
  weight = 400,
  className,
  style,
  color,
}: {
  name: string;
  size?: number;
  fill?: 0 | 1;
  weight?: number;
  className?: string;
  style?: CSSProperties;
  color?: string;
}) {
  return (
    <span
      aria-hidden
      className={className}
      style={{
        fontFamily: "'Material Symbols Rounded'",
        fontWeight: "normal",
        fontStyle: "normal",
        fontSize: size,
        lineHeight: 1,
        letterSpacing: "normal",
        textTransform: "none",
        display: "inline-block",
        whiteSpace: "nowrap",
        wordWrap: "normal",
        direction: "ltr",
        WebkitFontSmoothing: "antialiased",
        fontFeatureSettings: "'liga'",
        fontVariationSettings: `'FILL' ${fill}, 'wght' ${weight}, 'GRAD' 0, 'opsz' 24`,
        color,
        ...style,
      }}
    >
      {name}
    </span>
  );
}
