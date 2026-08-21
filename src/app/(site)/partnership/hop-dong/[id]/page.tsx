import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { ArrowLeft, FileSignature } from "lucide-react";
import {
  getContractByToken,
  logContractEvent,
  renderStoredContract,
} from "@/lib/server/partnership-contracts";
import { SignedContractView } from "@/components/partnership/signed-contract";
import { PrintContractButton } from "@/components/partnership/print-button";

export const dynamic = "force-dynamic";

// Hợp đồng là dữ liệu riêng của hai bên — không cho công cụ tìm kiếm đụng vào.
export const metadata: Metadata = {
  title: "Hợp đồng hợp tác",
  robots: { index: false, follow: false },
};

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
};

export default async function XemHopDongPage({ params, searchParams }: Props) {
  const [{ id }, { token }] = await Promise.all([params, searchParams]);

  const row = await getContractByToken(id, token ?? "");
  if (!row) notFound();

  const rendered = renderStoredContract(row);

  // Ghi lại mỗi lần mở — Điều 9.3 hứa lưu dấu vết thì phải lưu thật.
  const h = await headers();
  void logContractEvent({
    contractId: row.id,
    event: "viewed",
    actor: row.full_name,
    ip: h.get("cf-connecting-ip") ?? h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: h.get("user-agent"),
  });

  return (
    <main className="container-main my-8 max-w-4xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Link
          href="/partnership"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> Trang Hợp tác
        </Link>
        <PrintContractButton />
      </div>

      <div className="flex items-center gap-3 print:hidden">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary dark:bg-amber-400/10 dark:text-amber-400">
          <FileSignature className="size-5" />
        </span>
        <div>
          <h1 className="font-heading text-xl font-black uppercase tracking-tight text-foreground">
            Hợp đồng {row.code}
          </h1>
          <p className="text-xs text-muted-foreground">
            Bản điện tử của bạn. Giữ kín liên kết này — ai có link là xem được toàn bộ nội dung.
          </p>
        </div>
      </div>

      <SignedContractView row={row} rendered={rendered} />
    </main>
  );
}
