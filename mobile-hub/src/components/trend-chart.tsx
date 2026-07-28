import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Table2 } from "lucide-react";
import { cx } from "@/components/ui";
import { formatDate, formatNumber } from "@/lib/format";
import { haptic } from "@/lib/native";

/**
 * Biểu đồ lượt xem 30 ngày — MỘT chuỗi dữ liệu duy nhất nên không cần chú giải
 * (tiêu đề đã nói rõ đang xem gì). Màu vạch `#0ea5b7` được chọn bằng
 * scripts/validate_palette.js: nằm trong dải sáng cho nền tối và đạt tương phản
 * ≥ 3:1 so với mặt thẻ #0f1729.
 */
const SERIES = "#0ea5b7";

type Point = { date: string; views: number };

const WIDTH = 320;
const HEIGHT = 96;
const PAD_Y = 8;

export function TrendChart({ data, title }: { data: Point[]; title: string }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);

  const { points, linePath, areaPath, max, total } = useMemo(() => {
    const values = data.map((d) => d.views);
    const peak = Math.max(1, ...values);
    const step = data.length > 1 ? WIDTH / (data.length - 1) : WIDTH;

    const mapped = data.map((d, i) => ({
      x: i * step,
      y: HEIGHT - PAD_Y - (d.views / peak) * (HEIGHT - PAD_Y * 2),
      ...d,
    }));

    const line = mapped.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
    const area = mapped.length
      ? `${line} L${WIDTH} ${HEIGHT} L0 ${HEIGHT} Z`
      : "";

    return {
      points: mapped,
      linePath: line,
      areaPath: area,
      max: peak,
      total: values.reduce((sum, v) => sum + v, 0),
    };
  }, [data]);

  function handlePointer(event: ReactPointerEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg || points.length === 0) return;
    const rect = svg.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    const index = Math.min(points.length - 1, Math.max(0, Math.round(ratio * (points.length - 1))));
    if (index !== activeIndex) {
      haptic("light");
      setActiveIndex(index);
    }
  }

  const active = activeIndex === null ? null : points[activeIndex];
  const last = points[points.length - 1];

  if (data.length === 0) {
    return <p className="py-8 text-center text-[13px] text-mist-500">Chưa có dữ liệu lượt xem.</p>;
  }

  return (
    <div>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-[13px] text-mist-500">{title}</p>
          <p className="text-2xl font-semibold tabular-nums">{formatNumber(total)}</p>
        </div>
        <button
          type="button"
          onClick={() => setShowTable((v) => !v)}
          aria-label="Xem dạng bảng"
          className={cx(
            "grid size-8 place-items-center rounded-xl border border-ink-700 transition",
            showTable ? "bg-ink-700 text-mist-100" : "text-mist-500",
          )}
        >
          <Table2 className="size-4" />
        </button>
      </div>

      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          preserveAspectRatio="none"
          className="h-24 w-full touch-none"
          role="img"
          aria-label={`${title}: tổng ${formatNumber(total)} lượt xem trong ${data.length} ngày, cao nhất ${formatNumber(max)} ngày.`}
          onPointerDown={handlePointer}
          onPointerMove={(e) => e.buttons > 0 && handlePointer(e)}
          onPointerLeave={() => setActiveIndex(null)}
        >
          <defs>
            <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={SERIES} stopOpacity="0.32" />
              <stop offset="100%" stopColor={SERIES} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Đường nền mờ = mốc 0, cố tình nhạt để không tranh chấp với dữ liệu. */}
          <line x1="0" y1={HEIGHT - PAD_Y} x2={WIDTH} y2={HEIGHT - PAD_Y} stroke="#1d283f" strokeWidth="1" />

          <path d={areaPath} fill="url(#trend-fill)" />
          <path
            d={linePath}
            fill="none"
            stroke={SERIES}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />

          {active && (
            <>
              <line
                x1={active.x}
                y1="0"
                x2={active.x}
                y2={HEIGHT - PAD_Y}
                stroke="#2a3852"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
              {/* Vòng nền cùng màu mặt thẻ để chấm không dính vào đường. */}
              <circle cx={active.x} cy={active.y} r="5" fill="#0f1729" />
              <circle cx={active.x} cy={active.y} r="3.5" fill={SERIES} />
            </>
          )}

          {!active && last && (
            <>
              <circle cx={last.x} cy={last.y} r="5" fill="#0f1729" />
              <circle cx={last.x} cy={last.y} r="3.5" fill={SERIES} />
            </>
          )}
        </svg>

        <div className="mt-2 flex items-center justify-between text-[11px] text-mist-500">
          {active ? (
            <>
              <span>{formatDate(active.date)}</span>
              <span className="font-medium text-mist-100 tabular-nums">
                {formatNumber(active.views)} lượt xem
              </span>
            </>
          ) : (
            <>
              <span>{formatDate(data[0]?.date)}</span>
              <span>Chạm vào biểu đồ để xem từng ngày</span>
              <span>{formatDate(data[data.length - 1]?.date)}</span>
            </>
          )}
        </div>
      </div>

      {showTable && (
        <div className="mt-3 max-h-56 overflow-y-auto rounded-2xl border border-ink-700">
          <table className="w-full text-[13px]">
            <thead className="sticky top-0 bg-ink-800 text-left text-mist-500">
              <tr>
                <th className="px-3 py-2 font-medium">Ngày</th>
                <th className="px-3 py-2 text-right font-medium">Lượt xem</th>
              </tr>
            </thead>
            <tbody>
              {[...data].reverse().map((row) => (
                <tr key={row.date} className="border-t border-ink-800">
                  <td className="px-3 py-1.5 text-mist-300">{formatDate(row.date)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{formatNumber(row.views)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
