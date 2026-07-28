import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle2, CircleAlert, Info, TriangleAlert, X } from "lucide-react";
import { cx } from "@/components/ui";
import { hapticResult } from "@/lib/native";

type ToastTone = "success" | "error" | "warning" | "info";

type ToastItem = { id: number; tone: ToastTone; message: string };

type ToastApi = {
  show: (message: string, tone?: ToastTone) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

const TONE_STYLE: Record<ToastTone, { icon: typeof Info; className: string }> = {
  success: { icon: CheckCircle2, className: "border-ok/35 bg-ok/12 text-ok" },
  error: { icon: CircleAlert, className: "border-danger/35 bg-danger/12 text-danger" },
  warning: { icon: TriangleAlert, className: "border-warn/35 bg-warn/12 text-warn" },
  info: { icon: Info, className: "border-cyan-glow/35 bg-cyan-glow/12 text-cyan-glow" },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const show = useCallback(
    (message: string, tone: ToastTone = "info") => {
      const id = nextId.current++;
      // Giữ tối đa 3 thông báo để không che hết màn hình.
      setItems((current) => [...current.slice(-2), { id, tone, message }]);
      if (tone === "success") hapticResult("success");
      if (tone === "error") hapticResult("error");
      if (tone === "warning") hapticResult("warning");
      window.setTimeout(() => dismiss(id), tone === "error" ? 5200 : 3200);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      show,
      success: (message) => show(message, "success"),
      error: (message) => show(message, "error"),
      warning: (message) => show(message, "warning"),
    }),
    [show],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="safe-top pointer-events-none fixed inset-x-0 top-0 z-100 flex flex-col items-center gap-2 px-4 pt-2">
        {items.map((item) => {
          const { icon: Icon, className } = TONE_STYLE[item.tone];
          return (
            <div
              key={item.id}
              className={cx(
                "animate-in-up pointer-events-auto flex w-full max-w-md items-start gap-2.5 rounded-2xl border px-3.5 py-3 shadow-xl shadow-ink-950/60 backdrop-blur-lg",
                className,
              )}
            >
              <Icon className="mt-0.5 size-4 shrink-0" />
              <p className="flex-1 text-[13px] leading-snug">{item.message}</p>
              <button
                type="button"
                aria-label="Đóng thông báo"
                onClick={() => dismiss(item.id)}
                className="mt-0.5 opacity-70"
              >
                <X className="size-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast phải nằm trong <ToastProvider>");
  return ctx;
}

/** Lỗi bất kỳ → câu tiếng Việt để hiện toast. */
export function errorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return "Có lỗi xảy ra, thử lại sau.";
}
