import type { Metadata } from "next";
import { Images } from "lucide-react";
import { SectionHeading } from "@/components/common/section-heading";
import { GalleryGrid } from "@/components/gallery/gallery-grid";
import { getGalleryItems } from "@/lib/data/content-service";
import { siteConfig } from "@/lib/constants/site";

export const metadata: Metadata = {
  title: "Thư Viện Ảnh",
  description:
    "Khoảnh khắc cộng đồng Free Fire — ảnh sự kiện, giải đấu và hoạt động của cộng đồng Arex. Xem và lưu lại những khoảnh khắc đẹp nhất.",
  alternates: { canonical: `${siteConfig.url}/gallery` },
  openGraph: {
    title: "Thư Viện Ảnh Cộng Đồng Free Fire — Arex",
    description: "Ảnh sự kiện, giải đấu và hoạt động cộng đồng Free Fire từ Arex.",
    url: `${siteConfig.url}/gallery`,
    type: "website",
    siteName: siteConfig.name,
    locale: "vi_VN",
    images: [{ url: `${siteConfig.url}${siteConfig.ogImage}`, width: 1200, height: 630, alt: "Thư viện ảnh Free Fire — Arex" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Thư Viện Ảnh Cộng Đồng Free Fire — Arex",
    description: "Ảnh sự kiện, giải đấu và hoạt động cộng đồng Free Fire từ Arex.",
    images: [`${siteConfig.url}${siteConfig.ogImage}`],
  },
  robots: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
};

export const revalidate = 300;

export default async function GalleryPage() {
  const gallery = await getGalleryItems();

  const imageGalleryJsonLd = {
    "@context": "https://schema.org",
    "@type": "ImageGallery",
    name: "Thư viện ảnh cộng đồng Free Fire — Arex",
    url: `${siteConfig.url}/gallery`,
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
      <h1 className="sr-only">Thư viện ảnh cộng đồng Free Fire — Arex</h1>
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
