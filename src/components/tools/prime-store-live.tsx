"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowUpRight, Eye, Gem, HelpCircle, Loader2, RefreshCw, Sparkles, Timer } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DEFAULT_PRIME_SERVER,
  PRIME_SERVERS,
  PREDICTION_LEVELS,
  SERVER_LABEL,
  predictionLevel,
  primeItemIcon,
  type PrimeLiveItem,
  type PrimePrediction,
  type PrimeServer,
  type PrimeStoreLive,
} from "@/lib/constants/prime-store-live";

/** Giờ cập nhật — chỉ tính sau khi mount để server và client không lệch chuỗi. */
function useClock(ts: number | undefined) {
  const [label, setLabel] = useState<string | null>(null);
  useEffect(() => {
    setLabel(
      ts
        ? new Date(ts).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
        : null,
    );
  }, [ts]);
  return label;
}

function useCountdown(target: number | undefined) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  if (!target || now === null) return null;
  const diff = target - now;
  if (diff <= 0) return "Đã kết thúc";
  const d = Math.floor(diff / 86_400_000);
  const h = Math.floor((diff % 86_400_000) / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  return d > 0 ? `${d}n ${h}g ${m}p` : `${h}g ${m}p`;
}

function ItemIcon({ itemId, alt, className }: { itemId: string; alt: string; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={primeItemIcon(itemId)}
      alt={alt}
      loading="lazy"
      className={cn("size-full object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]", className)}
    />
  );
}

function PriceTag({ gems }: { gems: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-black text-amber-300">
      <Gem className="size-3 text-cyan-300" />
      {gems.toLocaleString("vi-VN")}
    </span>
  );
}

function LiveCard({ item }: { item: PrimeLiveItem }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-center">
      {item.recommended && (
        <span className="absolute left-1.5 top-1.5 rounded-md bg-amber-400/90 px-1.5 py-0.5 text-[8px] font-black uppercase text-black">
          Đề xuất
        </span>
      )}
      <div className="relative mx-auto size-16">
        <ItemIcon itemId={item.itemId} alt={item.label ?? `Vật phẩm ${item.itemId}`} />
        {item.amount > 1 && (
          <span className="absolute -bottom-0.5 -right-1 rounded-md bg-black/75 px-1 text-[9px] font-black tabular-nums text-white">
            ×{item.amount.toLocaleString("vi-VN")}
          </span>
        )}
      </div>
      <p className="mt-1.5 line-clamp-2 min-h-[2rem] text-[11px] font-semibold leading-tight text-white/85">
        {item.label ?? `#${item.itemId}`}
      </p>
      <PriceTag gems={item.gems} />
    </div>
  );
}

/** Màu theo bậc tín hiệu — cùng thứ tự với `PREDICTION_LEVELS`. */
const LEVEL_TONE = [
  { chip: "bg-emerald-400/90 text-black", bar: "bg-emerald-400" },
  { chip: "bg-amber-300/90 text-black", bar: "bg-amber-300" },
  { chip: "bg-white/15 text-white/70", bar: "bg-white/30" },
];

/**
 * Điểm thực tế chỉ chạy trong khoảng ~0.05–0.35, nên thanh dưới thẻ được kéo dãn
 * theo `BAR_FULL` — vẽ đúng 33% thì thẻ nào cũng gần rỗng, nhìn không ra hơn kém.
 */
const BAR_FULL = 0.35;

/** Khung chờ — thay vì làm mờ hàng của server cũ, dễ tưởng là hàng server mới. */
function CardSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-white/10 bg-white/[0.04] p-2.5">
      <div className="mx-auto size-16 rounded-lg bg-white/10" />
      <div className="mx-auto mt-2 h-3 w-4/5 rounded bg-white/10" />
      <div className="mx-auto mt-1.5 h-3 w-1/2 rounded bg-white/10" />
    </div>
  );
}

/** Thẻ dự đoán: mờ tịt cho tới khi người chơi bấm để lật. */
function PredictionCard({ item }: { item: PrimePrediction }) {
  const [revealed, setRevealed] = useState(false);
  const percent = Math.round(item.confidence * 100);
  const level = predictionLevel(item.confidence);
  const tone = LEVEL_TONE[PREDICTION_LEVELS.indexOf(level)] ?? LEVEL_TONE[LEVEL_TONE.length - 1];
  const barWidth = Math.min(100, Math.round((item.confidence / BAR_FULL) * 100));
  const ahead = item.aheadServers.length;

  return (
    <button
      type="button"
      onClick={() => setRevealed((v) => !v)}
      aria-label={revealed ? "Ẩn lại vật phẩm" : "Lật để xem vật phẩm dự đoán"}
      title={[
        `${level.label} — ${percent} điểm`,
        `Đang bán ở ${item.servers.length}/${item.sampleSize} server có dữ liệu`,
        ahead > 0 ? `${ahead} server đã sang đợt mới` : null,
        item.servers.map((s) => SERVER_LABEL[s]).join(", "),
      ]
        .filter(Boolean)
        .join("\n")}
      className={cn(
        "group relative w-full overflow-hidden rounded-xl border p-2.5 pb-3 text-center transition",
        revealed
          ? "border-emerald-400/40 bg-emerald-400/[0.06]"
          : "border-white/10 bg-white/[0.04] hover:border-amber-300/40",
      )}
    >
      <span
        className={cn(
          "absolute left-1.5 top-1.5 rounded-md px-1.5 py-0.5 text-[8px] font-black tabular-nums",
          tone.chip,
        )}
      >
        {percent}
      </span>
      <span className="absolute right-1.5 top-1.5 text-[8px] font-bold tabular-nums text-white/40">
        {item.servers.length}/{item.sampleSize}
      </span>

      <div className="mx-auto size-16">
        <ItemIcon
          itemId={item.itemId}
          alt={revealed ? (item.label ?? `Vật phẩm ${item.itemId}`) : "Vật phẩm bí ẩn"}
          className={cn(
            "transition duration-300",
            !revealed && "scale-95 blur-md brightness-50 saturate-0",
          )}
        />
        {!revealed && (
          <HelpCircle className="pointer-events-none absolute left-1/2 top-[2.4rem] size-7 -translate-x-1/2 text-white/70 transition group-hover:scale-110" />
        )}
      </div>

      <p className="mt-1.5 line-clamp-2 min-h-[2rem] text-[11px] font-semibold leading-tight text-white/85">
        {revealed ? (item.label ?? `#${item.itemId}`) : "Đoán xem là gì?"}
      </p>

      {revealed ? (
        <PriceTag gems={item.gems} />
      ) : (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-white/50">
          <Eye className="size-3" /> Bấm để lật
        </span>
      )}

      {ahead > 0 && (
        <span className="mt-1 flex items-center justify-center gap-0.5 text-[9px] font-bold text-emerald-300/90">
          <ArrowUpRight className="size-2.5" /> {ahead} server đã sang đợt mới
        </span>
      )}

      {/* Thanh tín hiệu */}
      <span className="absolute inset-x-0 bottom-0 block h-1 bg-white/[0.06]">
        <span className={cn("block h-full", tone.bar)} style={{ width: `${barWidth}%` }} />
      </span>
    </button>
  );
}

export function PrimeStoreLivePanel({ initial }: { initial: PrimeStoreLive }) {
  const [data, setData] = useState<PrimeStoreLive>(initial);
  const [server, setServer] = useState<PrimeServer>(initial.server ?? DEFAULT_PRIME_SERVER);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (next: PrimeServer) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/prime-store?server=${next}`);
      if (!res.ok) throw new Error();
      setData((await res.json()) as PrimeStoreLive);
    } catch {
      setError("Không tải được cửa hàng. Thử lại sau nhé.");
    } finally {
      setLoading(false);
    }
  }, []);

  const changeServer = (next: PrimeServer) => {
    setServer(next);
    // Giữ lựa chọn trong URL để chia sẻ / F5 vẫn đúng server, không cần điều hướng lại.
    const url = new URL(window.location.href);
    url.searchParams.set("server", next);
    window.history.replaceState(null, "", url);
    void load(next);
  };

  const remaining = useCountdown(data.window?.endAt);
  const updatedAt = useClock(data.fetchedAt);

  return (
    <div className="space-y-3">
      {/* Tiêu đề + chọn server */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div>
          <h2 className="font-heading text-base font-black uppercase tracking-wide text-white">
            Cửa hàng Prime trong game
          </h2>
          <p className="text-[11px] text-white/50">
            {remaining ? `Còn ${remaining}` : "Đang cập nhật…"}
            {data.window?.storeId ? ` · Đợt #${data.window.storeId}` : ""}
            {updatedAt ? ` · Lấy lúc ${updatedAt}` : ""}
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <select
            value={server}
            onChange={(e) => changeServer(e.target.value as PrimeServer)}
            aria-label="Chọn server"
            className="rounded-lg border border-white/15 bg-black/40 px-2 py-1.5 text-xs font-semibold text-white outline-none focus:border-amber-300/60"
          >
            {PRIME_SERVERS.map((s) => (
              <option key={s} value={s} className="bg-neutral-900">
                {SERVER_LABEL[s]}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void load(server)}
            disabled={loading}
            aria-label="Tải lại"
            className="rounded-lg border border-white/15 bg-black/40 p-1.5 text-white/70 transition hover:text-white disabled:opacity-50"
          >
            {loading ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
          </button>
        </div>
      </div>

      {error && (
        <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-center text-xs text-red-200">
          {error}
        </p>
      )}

      {/* Hàng đang bán */}
      {loading ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {Array.from({ length: Math.max(4, data.items.length) }, (_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : data.items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/15 px-3 py-8 text-center text-xs text-white/50">
          Server này chưa mở cửa hàng Prime.
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {data.items.map((item) => (
            <LiveCard key={item.itemId} item={item} />
          ))}
        </div>
      )}

      {/* Dự đoán hàng sắp về */}
      {data.predictions.length > 0 && (
        <div className="space-y-2 rounded-xl border border-amber-300/20 bg-amber-300/[0.04] p-2.5">
          <div className="flex items-start gap-2 px-0.5">
            <Sparkles className="mt-0.5 size-3.5 shrink-0 text-amber-300" />
            <div>
              <h3 className="font-heading text-xs font-black uppercase tracking-wide text-amber-200">
                Dự đoán hàng sắp về
              </h3>
              <p className="text-[10px] leading-relaxed text-white/50">
                Vật phẩm đang bán ở server khác mà {SERVER_LABEL[server]} chưa có. Số ở góc thẻ là
                <b className="text-white/70"> điểm tín hiệu</b> (không phải xác suất), tính từ hai
                thứ: server nào đã sang đợt mới mà bán món đó — nặng ký nhất — và tỉ lệ server có dữ
                liệu đang bày món đó. Điểm chỉ dùng để so hơn kém giữa các thẻ. Danh sách cắt theo
                cỡ một đợt hàng — đoán dài ra cho dễ trúng thì trúng cũng vô nghĩa. Bấm vào thẻ để
                lật xem bạn đoán đúng không.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {loading
              ? Array.from({ length: data.predictions.length }, (_, i) => <CardSkeleton key={i} />)
              : data.predictions.map((item) => <PredictionCard key={item.itemId} item={item} />)}
          </div>

          <p className="flex items-center justify-center gap-1 text-center text-[10px] text-white/40">
            <Timer className="size-3" /> Chỉ là dự đoán từ dữ liệu các server, không phải thông báo
            chính thức của Garena.
          </p>
        </div>
      )}
    </div>
  );
}
