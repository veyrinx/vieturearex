import {
  forwardRef,
  useEffect,
  useId,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { Loader2, Search, X, type LucideIcon } from "lucide-react";
import { haptic } from "@/lib/native";

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

// ── Nút ─────────────────────────────────────────────────────────────────────

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-linear-to-r from-violet-glow to-cyan-glow text-ink-950 font-semibold shadow-lg shadow-violet-glow/25 active:brightness-95",
  secondary: "bg-ink-800 text-mist-100 border border-ink-700 active:bg-ink-700",
  ghost: "text-mist-300 active:bg-ink-800",
  danger: "bg-danger/15 text-danger border border-danger/30 active:bg-danger/25",
  outline: "border border-ink-600 text-mist-100 active:bg-ink-800",
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: LucideIcon;
  block?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, icon: Icon, block, className, children, onClick, disabled, ...rest },
  ref,
) {
  const sizes = {
    sm: "h-9 px-3.5 text-[13px] rounded-xl gap-1.5",
    md: "h-11 px-4 text-sm rounded-2xl gap-2",
    lg: "h-13 px-5 text-[15px] rounded-2xl gap-2",
  };

  return (
    <button
      ref={ref}
      className={cx(
        "inline-flex items-center justify-center transition-[transform,filter,background-color] duration-150 active:scale-[0.98] disabled:opacity-45 disabled:active:scale-100",
        sizes[size],
        BUTTON_VARIANTS[variant],
        block && "w-full",
        className,
      )}
      disabled={disabled || loading}
      onClick={(e) => {
        haptic("light");
        onClick?.(e);
      }}
      {...rest}
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : Icon ? (
        <Icon className={size === "sm" ? "size-3.5" : "size-4"} />
      ) : null}
      {children}
    </button>
  );
});

export function IconButton({
  icon: Icon,
  label,
  tone = "default",
  className,
  onClick,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: LucideIcon;
  label: string;
  tone?: "default" | "danger" | "ok";
}) {
  const tones = {
    default: "text-mist-300 active:bg-ink-700",
    danger: "text-danger active:bg-danger/15",
    ok: "text-ok active:bg-ok/15",
  };
  return (
    <button
      type="button"
      aria-label={label}
      className={cx(
        "grid size-9 shrink-0 place-items-center rounded-xl border border-ink-700 bg-ink-850 transition active:scale-95",
        tones[tone],
        className,
      )}
      onClick={(e) => {
        haptic("light");
        onClick?.(e);
      }}
      {...rest}
    >
      <Icon className="size-4" />
    </button>
  );
}

// ── Bố cục ──────────────────────────────────────────────────────────────────

export function Card({
  className,
  children,
  onClick,
}: {
  className?: string;
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <div
      className={cx(
        "rounded-xl2 border border-ink-700/70 bg-ink-850/80 p-4",
        onClick && "transition active:scale-[0.99] active:bg-ink-800",
        className,
      )}
      onClick={
        onClick
          ? () => {
              haptic("light");
              onClick();
            }
          : undefined
      }
    >
      {children}
    </div>
  );
}

export function SectionTitle({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-2.5 flex items-end justify-between gap-3 px-0.5">
      <h2 className="text-[13px] font-semibold tracking-wide text-mist-500 uppercase">{children}</h2>
      {action}
    </div>
  );
}

// ── Nhãn trạng thái ─────────────────────────────────────────────────────────

export type ChipTone = "neutral" | "ok" | "warn" | "danger" | "info";

const CHIP_TONES: Record<ChipTone, string> = {
  neutral: "bg-ink-800 text-mist-300 border-ink-600",
  ok: "bg-ok/12 text-ok border-ok/25",
  warn: "bg-warn/12 text-warn border-warn/25",
  danger: "bg-danger/12 text-danger border-danger/25",
  info: "bg-cyan-glow/12 text-cyan-glow border-cyan-glow/25",
};

export function Chip({
  tone = "neutral",
  children,
  className,
}: {
  tone?: ChipTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        CHIP_TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

// ── Nhập liệu ───────────────────────────────────────────────────────────────

export function Field({
  label,
  hint,
  error,
  required,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1 text-[13px] font-medium text-mist-300">
        {label}
        {required && <span className="text-danger">*</span>}
      </span>
      {children}
      {error ? (
        <span className="mt-1 block text-[12px] text-danger">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-[12px] text-mist-500">{hint}</span>
      ) : null}
    </label>
  );
}

const CONTROL_BASE =
  "w-full rounded-2xl border border-ink-700 bg-ink-900 px-3.5 py-3 text-mist-100 placeholder:text-mist-500/70 outline-none transition focus:border-violet-glow/60 focus:ring-2 focus:ring-violet-glow/20 disabled:opacity-50";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return <input ref={ref} className={cx(CONTROL_BASE, className)} {...rest} />;
  },
);

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, rows = 5, ...rest }, ref) {
    return (
      <textarea ref={ref} rows={rows} className={cx(CONTROL_BASE, "resize-y", className)} {...rest} />
    );
  },
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...rest }, ref) {
    return (
      <select ref={ref} className={cx(CONTROL_BASE, "appearance-none pr-9", className)} {...rest}>
        {children}
      </select>
    );
  },
);

export function SearchInput({
  value,
  onChange,
  placeholder = "Tìm kiếm…",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-mist-500" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cx(CONTROL_BASE, "py-2.5 pl-10", value && "pr-10")}
      />
      {value && (
        <button
          type="button"
          aria-label="Xoá tìm kiếm"
          onClick={() => onChange("")}
          className="absolute top-1/2 right-3 -translate-y-1/2 text-mist-500"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => {
        haptic("light");
        onChange(!checked);
      }}
      className={cx(
        "relative h-6.5 w-11 shrink-0 rounded-full border transition",
        checked ? "border-violet-glow/50 bg-violet-glow/70" : "border-ink-600 bg-ink-800",
      )}
    >
      <span
        className={cx(
          "absolute top-0.5 size-5 rounded-full bg-mist-100 transition-[left]",
          checked ? "left-5.5" : "left-0.5",
        )}
      />
    </button>
  );
}

/** Bộ chọn dạng tab pill — dùng cho lọc trạng thái / loại nội dung. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; count?: number }[];
}) {
  return (
    <div className="flex gap-1 overflow-x-auto rounded-2xl border border-ink-700 bg-ink-900 p-1">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => {
              haptic("light");
              onChange(option.value);
            }}
            className={cx(
              "flex-1 shrink-0 rounded-xl px-3 py-2 text-[13px] font-medium whitespace-nowrap transition",
              active ? "bg-ink-700 text-mist-100 shadow-sm" : "text-mist-500",
            )}
          >
            {option.label}
            {option.count !== undefined && (
              <span className={cx("ml-1.5 text-[11px]", active ? "text-cyan-glow" : "text-mist-500")}>
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── Trạng thái ──────────────────────────────────────────────────────────────

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cx("size-5 animate-spin text-mist-500", className)} />;
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cx("skeleton rounded-2xl", className)}>
      <div className="skeleton-shine" />
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl2 border border-dashed border-ink-700 px-6 py-12 text-center">
      <div className="grid size-12 place-items-center rounded-2xl bg-ink-800 text-mist-500">
        <Icon className="size-5" />
      </div>
      <div>
        <p className="font-medium text-mist-100">{title}</p>
        {description && <p className="mt-1 text-[13px] text-mist-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-xl2 border border-danger/30 bg-danger/8 px-4 py-5 text-center">
      <p className="text-[13px] text-danger">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-3" onClick={onRetry}>
          Thử lại
        </Button>
      )}
    </div>
  );
}

// ── Bottom sheet ────────────────────────────────────────────────────────────

export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const titleId = useId();
  const [mounted, setMounted] = useState(open);

  useEffect(() => {
    if (open) {
      setMounted(true);
      return;
    }
    // Giữ DOM thêm chút cho animation đóng chạy hết.
    const timer = window.setTimeout(() => setMounted(false), 200);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!mounted) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button
        type="button"
        aria-label="Đóng"
        onClick={onClose}
        className={cx(
          "absolute inset-0 bg-ink-950/75 transition-opacity duration-200",
          open ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        className={cx(
          "safe-bottom relative max-h-[88vh] overflow-y-auto rounded-t-3xl border-t border-ink-700 bg-ink-900 transition-transform duration-200",
          open ? "translate-y-0" : "translate-y-full",
        )}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-ink-800 bg-ink-900/95 px-4 pt-3 pb-3 backdrop-blur">
          <div className="absolute top-1.5 left-1/2 h-1 w-10 -translate-x-1/2 rounded-full bg-ink-600" />
          <h3 id={titleId} className="mt-1 text-[15px] font-semibold">
            {title}
          </h3>
          <IconButton icon={X} label="Đóng" onClick={onClose} className="mt-1" />
        </div>
        <div className="px-4 py-4">{children}</div>
        {footer && (
          <div className="sticky bottom-0 border-t border-ink-800 bg-ink-900/95 px-4 py-3 backdrop-blur">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function ConfirmSheet({
  open,
  title,
  message,
  confirmLabel = "Xác nhận",
  destructive,
  loading,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Sheet open={open} onClose={onCancel} title={title}>
      <p className="text-[14px] leading-relaxed text-mist-300">{message}</p>
      <div className="mt-5 flex gap-2">
        <Button variant="secondary" block onClick={onCancel} disabled={loading}>
          Huỷ
        </Button>
        <Button
          variant={destructive ? "danger" : "primary"}
          block
          loading={loading}
          onClick={onConfirm}
        >
          {confirmLabel}
        </Button>
      </div>
    </Sheet>
  );
}

export function Avatar({
  url,
  name,
  size = 40,
}: {
  url?: string | null;
  name: string;
  size?: number;
}) {
  const initials = name.trim().slice(0, 2).toUpperCase() || "AX";
  return url ? (
    <img
      src={url}
      alt=""
      width={size}
      height={size}
      className="shrink-0 rounded-full border border-ink-700 object-cover"
      style={{ width: size, height: size }}
    />
  ) : (
    <span
      className="grid shrink-0 place-items-center rounded-full bg-linear-to-br from-violet-glow/70 to-cyan-glow/70 text-[12px] font-bold text-ink-950"
      style={{ width: size, height: size }}
    >
      {initials}
    </span>
  );
}
