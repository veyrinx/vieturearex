import { VerificationForm } from "@/components/craftland/studio-forms";
import { VerifiedBadge } from "@/components/craftland/verified-badge";
import { requireStudioUser, tbl } from "@/lib/server/craftland";
import { VERIFICATION_META, VERIFIED_BADGE_DISCLAIMER } from "@/lib/constants/craftland";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const dt = new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" });
const REQ_LABELS: Record<string, string> = {
  pending: "Đang chờ xét duyệt",
  needs_info: "Cần bổ sung thông tin",
  approved: "Đã duyệt",
  rejected: "Bị từ chối",
  withdrawn: "Đã rút",
};

export default async function StudioVerificationPage() {
  const { userId, creator } = await requireStudioUser({ needProfile: true });
  // Không lấy review_notes — ghi chú nội bộ của đội kiểm duyệt.
  const { data } = (await tbl("craftland_verification_requests")
    .select("id, status, decision_reason, decided_at, created_at")
    .eq("creator_id", userId)
    .order("created_at", { ascending: false })
    .limit(20)) as unknown as { data: Array<{ id: string; status: string; decision_reason: string | null; decided_at: string | null; created_at: string }> | null };
  const requests = data ?? [];
  const open = requests.find((r) => r.status === "pending" || r.status === "needs_info");
  const status = creator!.verification_status;
  const meta = VERIFICATION_META[status];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-2xl font-bold">Xác minh creator</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{VERIFIED_BADGE_DISCLAIMER}</p>
      </div>

      <div className={cn("flex items-center gap-2 rounded-xl p-4 text-sm font-semibold", meta.tone)}>
        {status === "verified" && <VerifiedBadge />}
        Trạng thái: {meta.label}
      </div>

      {open?.status === "needs_info" && open.decision_reason && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-200">
          <strong>Đội ngũ cần bạn bổ sung:</strong> {open.decision_reason}
        </div>
      )}

      {status !== "verified" && creator!.status === "active" && (
        <div className="rounded-2xl border border-border bg-card p-5 md:p-6">
          {open?.status === "pending" ? (
            <div className="space-y-3">
              <p className="text-sm">Yêu cầu của bạn đang chờ xét duyệt. Bạn sẽ thấy kết quả tại đây.</p>
              <VerificationForm defaultName={creator!.display_name} canWithdraw needsInfo={false} />
            </div>
          ) : (
            <VerificationForm defaultName={creator!.display_name} canWithdraw={!!open} needsInfo={open?.status === "needs_info"} />
          )}
        </div>
      )}

      {requests.length > 0 && (
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold">Lịch sử yêu cầu</h2>
          <ul className="mt-3 divide-y divide-border text-sm">
            {requests.map((r) => (
              <li key={r.id} className="py-2.5">
                <div className="flex justify-between gap-3">
                  <span className="font-medium">{REQ_LABELS[r.status] ?? r.status}</span>
                  <span className="text-xs text-muted-foreground">{dt.format(new Date(r.decided_at ?? r.created_at))}</span>
                </div>
                {r.decision_reason && <p className="mt-0.5 text-muted-foreground">{r.decision_reason}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
