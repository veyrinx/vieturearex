import type { Metadata } from "next";
import { ApiDocsPanel } from "@/components/admin/api-docs-panel";

export const metadata: Metadata = { title: "API Docs" };

export default function ApiDocsPage() {
  return <ApiDocsPanel />;
}
