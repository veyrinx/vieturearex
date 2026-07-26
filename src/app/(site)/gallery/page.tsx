import type { Metadata } from "next";
import { Images } from "lucide-react";
import { SectionHeading } from "@/components/common/section-heading";
import { GalleryGrid } from "@/components/gallery/gallery-grid";
import { getGalleryItems } from "@/lib/data/content-service";
import { getSiteConfig } from "@/lib/server/get-site-config";

// Domain và brand lấy theo host đang truy cập để ISC không tự trỏ về Arex.
export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteConfig();
  const url = `${site.url}/gallery`;
  const title = `Thư Viện Ảnh Cộng Đồng Free Fire — ${site.shortName}`;
  const description = `Ảnh sự kiện, giải đấu và hoạt động cộng đồng Free Fire từ ${site.shortName}.`;

  return {
    title: "Thư Viện Ảnh",
    description: `Khoảnh khắc cộng đồng Free Fire — ảnh sự kiện, giải đấu và hoạt động của cộng đồng ${site.shortName}. Xem và lưu lại những khoảnh khắc đẹp nhất.`,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      siteName: site.name,
      locale: "vi_VN",
      images: [{ url: site.ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [site.ogImage],
    },
    robots: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  };
}

export const revalidate = 300;

export default async function GalleryPage() {
  const [gallery, site] = await Promise.all([getGalleryItems(), getSiteConfig()]);

  const imageGalleryJsonLd = {
    "@context": "https://schema.org",
    "@type": "ImageGallery",
    name: `Thư viện ảnh cộng đồng Free Fire — ${site.shortName}`,
    url: `${site.url}/gallery`,
    inLanguage: "vi-VN",
    numberOfItems: gallery.length,
    associatedMedia: gallery.slice(0, 50).map((item) => ({
      "@type": "ImageObject",
      contentUrl: item.image_url,
      name: item.tag || "Ảnh cộng đồng Free Fire",
    })),
  };

  return (
    <div className="space-y-8 pt-6 md:pt-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(imageGalleryJsonLd) }}
      />
      <h1 className="sr-only">Thư viện ảnh cộng đồng Free Fire — {site.shortName}</h1>
      <SectionHeading
        eyebrow="Gallery"
        icon={Images}
        title="KHOẢNH KHẮC CỘNG ĐỒNG"
        description="Ảnh sự kiện, giải đấu và hoạt động của cộng đồng Free Fire — nhấn để xem full"
      />
      <GalleryGrid items={gallery} />
    </div>
  );
}
