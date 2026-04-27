import Link from "next/link";

type Slot = { image?: string | null; link?: string | null };

type SideAdsProps = {
  left?: Slot;
  right?: Slot;
};

function AdSlot({ slot, side }: { slot: Slot | undefined; side: "left" | "right" }) {
  if (!slot?.image) return null;
  const inner = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={slot.image}
      alt={`Quảng cáo ${side === "left" ? "trái" : "phải"}`}
      className="h-full w-full rounded-2xl object-cover shadow-lg ring-1 ring-border/40"
      loading="lazy"
    />
  );
  return (
    <aside
      aria-label={`Quảng cáo ${side}`}
      className={`pointer-events-auto fixed top-32 hidden xl:block z-20 w-40 2xl:w-52`}
      style={side === "left" ? { left: "max(1rem, calc((100vw - 80rem) / 2 - 11rem))" } : { right: "max(1rem, calc((100vw - 80rem) / 2 - 11rem))" }}
    >
      <div className="aspect-[3/5] w-full">
        {slot.link ? (
          <Link
            href={slot.link}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="block h-full w-full transition-transform hover:scale-[1.02]"
          >
            {inner}
          </Link>
        ) : (
          inner
        )}
      </div>
      <p className="mt-1 text-center text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/60">
        Quảng cáo
      </p>
    </aside>
  );
}

export function SideAds({ left, right }: SideAdsProps) {
  if (!left?.image && !right?.image) return null;
  return (
    <>
      <AdSlot slot={left} side="left" />
      <AdSlot slot={right} side="right" />
    </>
  );
}
