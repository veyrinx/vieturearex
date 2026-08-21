"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Eraser, PenLine } from "lucide-react";

/**
 * Ô ký tay bằng chuột hoặc ngón tay. Xuất PNG nền trong suốt, nét đen — trang
 * xem hợp đồng đảo màu ở chế độ tối nên nét phải là đen tuyền, không phải màu
 * theo theme.
 *
 * Canvas vẽ ở độ phân giải thật của màn hình (devicePixelRatio) rồi thu về
 * bằng CSS, nếu không thì trên điện thoại nét ký ra răng cưa.
 */
export function SignaturePad({
  value,
  onChange,
  disabled,
  label = "Ký tên vào khung dưới",
  height = 160,
}: {
  value: string;
  onChange: (dataUrl: string) => void;
  disabled?: boolean;
  label?: string;
  height?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const dirty = useRef(false);
  const [empty, setEmpty] = useState(!value);

  // Dựng lại kích thước canvas theo bề rộng thật của khung.
  const setup = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 3);
    const width = canvas.clientWidth;
    if (!width) return;
    // Giữ lại nét đã vẽ khi khung đổi kích thước (xoay ngang điện thoại).
    const previous = dirty.current ? canvas.toDataURL("image/png") : null;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#111111";
    if (previous) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, width, height);
      img.src = previous;
    }
  }, [height]);

  useEffect(() => {
    setup();
    window.addEventListener("resize", setup);
    return () => window.removeEventListener("resize", setup);
  }, [setup]);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    drawing.current = true;
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    // Chạm một phát rồi nhả cũng phải ra một chấm, không thì người dùng tưởng hỏng.
    ctx.lineTo(x + 0.1, y + 0.1);
    ctx.stroke();
  };

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || disabled) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = pos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    dirty.current = true;
    setEmpty(false);
    const canvas = canvasRef.current;
    if (canvas) onChange(canvas.toDataURL("image/png"));
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    dirty.current = false;
    setEmpty(true);
    onChange("");
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          <PenLine className="size-3.5" /> {label}
        </span>
        {!disabled && (
          <button
            type="button"
            onClick={clear}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-muted-foreground hover:text-rose-500"
          >
            <Eraser className="size-3.5" /> Ký lại
          </button>
        )}
      </div>

      <div className="relative overflow-hidden rounded-xl border-2 border-dashed border-border bg-white">
        <canvas
          ref={canvasRef}
          style={{ height, touchAction: "none" }}
          className="block w-full cursor-crosshair"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
          onPointerCancel={end}
        />
        {empty && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-slate-400">
            Dùng chuột hoặc ngón tay để ký vào đây
          </span>
        )}
      </div>
    </div>
  );
}
