import type { Metadata } from "next";
import { getAdminProfiles } from "@/lib/data/content-service";
import { TeamGrid } from "@/components/team/team-grid";
import { SectionHeading } from "@/components/common/section-heading";

export const metadata: Metadata = {
  title: "Đội Ngũ",
  description: "Gặp gỡ đội ngũ quản trị và vận hành của Arex Network — những người xây dựng và phát triển cộng đồng Free Fire.",
};

export const revalidate = 120;

export default async function TeamPage() {
  const profiles = await getAdminProfiles();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-6 md:py-14">
      {/* Header */}
      <div className="mb-10 space-y-4">
        <SectionHeading
          eyebrow="Arex Network"
          title="ĐỘI NGŨ VẬN HÀNH"
          description="Gặp gỡ những người đứng sau Arex — đội ngũ quản trị, biên tập và hỗ trợ cộng đồng Free Fire mỗi ngày."
        />
      </div>

      <TeamGrid profiles={profiles} />
    </div>
  );
}
