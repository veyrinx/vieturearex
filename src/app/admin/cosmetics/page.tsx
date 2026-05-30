import type { Metadata } from "next";
import { CosmeticsManager } from "@/components/admin/cosmetics-manager";

export const metadata: Metadata = { title: "Cosmetics Manager — Admin" };

export default function AdminCosmeticsPage() {
  return <CosmeticsManager />;
}
