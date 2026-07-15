import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Hash, Tag, Layers, Gem } from "lucide-react";
import { siteConfig } from "@/lib/constants/site";
import { getItemDetail, getRelatedItems } from "@/lib/data/ff-items";
import { getItemMetaById } from "@/lib/data/ff-item-meta";
import { ffItemTypeLabel, ffItemTypeStyle, ffRarityMeta } from "@/lib/constants/ff-item-types";
import { ItemActions } from "@/components/items/item-actions";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const item = await getItemDetail(id);
  if (!item) return { title: "Không tìm thấy item — Arex" };

  const m = getItemMetaById(item.id);
  const name = item.label || m.name || `Item ${item.id}`;
  const url = `${siteConfig.url}/items/${item.id}`;
  const desc = m.description
    ? `${name} — ${m.description.slice(0, 150)}`
    : `Tra cứu ${name} (ID ${item.id}) trong Free Fire — ảnh chất lượng cao, copy URL & tải xuống. Thư viện icon cộng đồng Arex.`;

  return {
    title: `${name} — Item Free Fire | Arex`,
    description: desc,
    alternates: { canonical: url },
    openGraph: {
      title: name,
      description: desc,
      url,
      type: "website",
      siteName: siteConfig.name,
      images: [{ url: item.imageUrl, alt: name }],
    },
    twitter: { card: "summary_large_image", title: name, description: desc, images: [item.imageUrl] },
    robots: { index: true, follow: true, "max-image-preview": "large" },
  };
}

export const revalidate = 300;

export default async function ItemDetailPage({ params }: Props) {
  const { id } = await params;
  const item = await getItemDetail(id);
  if (!item) notFound();

  const related = await getRelatedItems(item);
  const relatedEnriched = related.map((r) => {
    const m = getItemMetaById(r.id);
    const rr = m.rarity && m.rarity !== "NONE" ? ffRarityMeta(m.rarity) : null;
    return { ...r, displayName: m.name ?? r.label ?? r.id, rarityBg: rr?.bg ?? null };
  });
  const meta = getItemMetaById(item.id);
  const name = item.label || meta.name || `Item ${item.id}`;
  // Loại chuẩn (49 loại) — ưu tiên map chuẩn, fallback catalog admin.
  const typeName = meta.type ?? null;
  const cat = typeName ? { label: ffItemTypeLabel(typeName), ...ffItemTypeStyle(typeName) } : null;
  const rarity = meta.rarity && meta.rarity !== "NONE" ? ffRarityMeta(meta.rarity) : null;

  return (
    <div className="mx-auto max-w-5xl py-6 md:py-10 space-y-8">
      {/* Back */}
      <Link
        href="/items"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Thư Viện Icon
      </Link>

      {/* Detail */}
      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_1.15fr]">
        {/* Ảnh */}
        <div className={`relative overflow-hidden rounded-3xl border border-border ${rarity ? rarity.bg : "bg-gradient-to-br from-muted/50 to-background"}`}>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent dark:via-amber-400/40" />
          <div className="flex aspect-square items-center justify-center p-8 md:p-12">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.imageUrl} alt={name} className="max-h-full max-w-full object-contain drop-shadow-xl" />
          </div>
        </div>

        {/* Thông tin */}
        <div className="flex flex-col gap-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {cat && (
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold ${cat.bg} ${cat.color}`}>
                  <Tag className="size-3" /> {cat.label}
                </span>
              )}
              {rarity && (
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold ${rarity.bg} ${rarity.text}`}>
                  <span className={`size-2 rounded-full ${rarity.dot}`} /> {rarity.label}
                </span>
              )}
              {item.is_hot && (
                <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 px-3 py-1 text-[11px] font-bold text-orange-600 dark:text-orange-400">
                  🔥 Hot / Mới ra
                </span>
              )}
              {item.ob && (
                <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold text-primary dark:bg-amber-400/10 dark:text-amber-400">
                  {item.ob}
                </span>
              )}
            </div>
            <h1 className="font-heading text-2xl font-black uppercase tracking-tight text-foreground md:text-3xl">
              {name}
            </h1>
            {meta.description ? (
              <p className="text-sm leading-relaxed text-muted-foreground">{meta.description}</p>
            ) : item.label ? (
              <p className="text-sm text-muted-foreground">Icon Free Fire trong thư viện cộng đồng Arex.</p>
            ) : null}
          </div>

          {/* Meta rows */}
          <div className="space-y-2 rounded-2xl border border-border bg-card p-4">
            <MetaRow icon={Hash} label="Item ID" value={item.id} mono />
            <MetaRow icon={Layers} label="Loại" value={cat?.label ?? "Chưa phân loại"} />
            {rarity && <MetaRow icon={Gem} label="Độ hiếm" value={rarity.label} />}
            {item.ob && <MetaRow icon={Tag} label="Phiên bản" value={item.ob} />}
            <div className="pt-1">
              <p className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                URL ảnh
              </p>
              <p className="break-all rounded-lg bg-muted/50 px-3 py-2 font-mono text-[11px] text-muted-foreground">
                {item.imageUrl}
              </p>
            </div>
          </div>

          <ItemActions imageUrl={item.imageUrl} id={item.id} />
        </div>
      </div>

      {/* Liên quan */}
      {related.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="font-heading text-lg font-black uppercase tracking-tight text-foreground">
              Item liên quan
            </h2>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
              {related.length}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
            {relatedEnriched.map((r) => (
              <Link
                key={r.id}
                href={`/items/${r.id}`}
                className="group rounded-xl border border-border bg-muted/30 p-2 transition-colors hover:border-primary/40"
              >
                <div className={`flex aspect-square items-center justify-center overflow-hidden rounded-lg ${r.rarityBg ?? "bg-background"}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={r.imageUrl}
                    alt={r.displayName}
                    loading="lazy"
                    className="size-full object-contain p-1 transition-transform group-hover:scale-105"
                  />
                </div>
                <p className="mt-1 truncate text-center text-[10px] font-semibold text-foreground/80">
                  {r.displayName}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MetaRow({
  icon: Icon, label, value, mono,
}: { icon: React.ElementType; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3.5" /> {label}
      </span>
      <span className={`text-sm font-bold text-foreground ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}
