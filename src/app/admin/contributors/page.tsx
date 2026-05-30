import type { Metadata } from "next";
import { ContributorsPanel } from "@/components/admin/contributors-panel";

export const metadata: Metadata = { title: "Top Contributors — Admin" };

export default function AdminContributorsPage() {
  return <ContributorsPanel />;
}
