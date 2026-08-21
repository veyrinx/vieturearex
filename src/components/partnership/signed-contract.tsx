import { AlertTriangle, ShieldCheck } from "lucide-react";
import {
  CONTRACT_STATUS_LABEL,
  CONTRACT_STATUS_TONE,
  partyBName,
  vnDateTime,
  KIND_LABEL,
  type ContractDocument,
  type ContractRecord,
} from "@/lib/constants/partnership-contract";
import { TIER_LABEL } from "@/lib/constants/partners";
import {
  ContractDocumentView, ContractSignatures, type SignatureBlock,
} from "@/components/partnership/contract-document";
import { cn } from "@/lib/utils";

export type RenderedContractProps = {
  doc: ContractDocument | null;
  hashOk: boolean;
  rawText: string;
  hash: string;
};

/**
 * Hợp đồng đã ký, hiển thị giống nhau ở trang của đối tác và trong bảng quản
 * trị. Không dùng hook nào để cả server component lẫn client component đều gọi được.
 */
export function SignedContractView({
  row,
  rendered,
  showAudit = true,
}: {
  row: ContractRecord;
  rendered: RenderedContractProps;
  showAudit?: boolean;
}) {
  const partyASigned = !!row.a_signed_at;

  const blockA: SignatureBlock = {
    heading: "Đại diện Bên A",
    name: row.a_signer_name || row.party_a?.repName || "",
    title: row.a_signer_title || row.party_a?.repTitle || null,
    image: row.a_signature,
    signedAt: row.a_signed_at ? vnDateTime(row.a_signed_at) : null,
    meta: showAudit && row.a_sign_ip ? [["IP", row.a_sign_ip]] : undefined,
  };

  const blockB: SignatureBlock = {
    heading: "Đại diện Bên B",
    name: row.b_signed_name || row.full_name,
    title: row.party_type === "team" ? row.rep_title || null : row.display_name || null,
    image: row.b_signature,
    signedAt: row.b_signed_at ? vnDateTime(row.b_signed_at) : null,
    meta: showAudit
      ? ([
          row.b_sign_ip ? (["IP", row.b_sign_ip] as [string, string]) : null,
          row.b_sign_device ? (["Thiết bị", row.b_sign_device] as [string, string]) : null,
          row.b_sign_browser ? (["Trình duyệt", row.b_sign_browser] as [string, string]) : null,
        ].filter(Boolean) as Array<[string, string]>)
      : undefined,
  };

  return (
    <div className="space-y-4">
      {/* Thanh trạng thái — phần duy nhất không in ra giấy */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-4 print:hidden">
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-wider",
            CONTRACT_STATUS_TONE[row.status],
          )}
        >
          {CONTRACT_STATUS_LABEL[row.status]}
        </span>
        <span className="font-mono text-xs text-muted-foreground">{row.code}</span>
        <span className="text-xs text-muted-foreground">
          · {KIND_LABEL[row.kind]}
          {row.kind === "team" && row.tier ? ` · ${TIER_LABEL[row.tier]}` : ""}
        </span>
        <span className="text-xs text-muted-foreground">· {partyBName(row)}</span>
        <span className="text-xs text-muted-foreground">
          · {row.term_start} → {row.term_end}
        </span>
        {!partyASigned && row.status === "pending" && (
          <span className="text-xs text-amber-600 dark:text-amber-400">· Đang chờ người đại diện Arex ký</span>
        )}
      </div>

      {row.reject_reason && (row.status === "rejected" || row.status === "terminated") && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/[0.05] p-4 text-sm text-rose-600 dark:text-rose-400 print:hidden">
          <strong>{row.status === "rejected" ? "Lý do từ chối" : "Lý do chấm dứt"}:</strong> {row.reject_reason}
        </div>
      )}

      {/* Toàn vẹn nội dung */}
      <div
        className={cn(
          "flex items-start gap-2 rounded-2xl border p-3 text-xs print:hidden",
          rendered.hashOk
            ? "border-emerald-500/30 bg-emerald-500/[0.05] text-emerald-700 dark:text-emerald-400"
            : "border-amber-500/40 bg-amber-500/[0.05] text-amber-700 dark:text-amber-400",
        )}
      >
        {rendered.hashOk ? (
          <ShieldCheck className="mt-0.5 size-4 shrink-0" />
        ) : (
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
        )}
        <span>
          {rendered.hashOk
            ? "Đối chiếu SHA-256 khớp — nội dung hợp đồng đúng như lúc hai bên ký."
            : `Mẫu điều khoản đã sang phiên bản khác (bản ký là ${row.terms_version}). Bên dưới hiển thị nguyên văn đã lưu — đây mới là bản có giá trị pháp lý.`}
        </span>
      </div>

      {rendered.doc ? (
        <ContractDocumentView doc={rendered.doc} hash={rendered.hash} signatures={{ a: blockA, b: blockB }} />
      ) : (
        <article className="rounded-2xl border border-border bg-card p-5 md:p-8 print:border-0 print:p-0">
          <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-foreground">
            {rendered.rawText}
          </pre>
          <div className="mt-6 rounded-xl border border-dashed border-border bg-muted/30 p-3">
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Mã kiểm tra toàn vẹn (SHA-256)
            </p>
            <p className="mt-1 break-all font-mono text-[11px] text-foreground">{rendered.hash}</p>
          </div>
          <ContractSignatures a={blockA} b={blockB} />
        </article>
      )}
    </div>
  );
}
