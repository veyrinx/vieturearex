import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { enforceAdminApiAuth, enforceRateLimit, getClientIp } from "@/lib/server/api-guard";
import { getAuthContext } from "@/lib/server/auth";
import { logAdminActivity } from "@/lib/server/admin-activity";
import { buildEmailHtml, getEmailBranding, sendMail } from "@/lib/server/email";
import { siteConfig } from "@/lib/constants/site";
import { TIER_LABEL } from "@/lib/constants/partners";
import { CONTRACT_STATUS_LABEL } from "@/lib/constants/partnership-contract";
import {
  getContractById,
  listContractEvents,
  logContractEvent,
  renderStoredContract,
  updateContract,
} from "@/lib/server/partnership-contracts";

const signature = z
  .string()
  .regex(/^data:image\/png;base64,[A-Za-z0-9+/=]+$/, "Chữ ký không hợp lệ")
  .max(300_000);

const schema = z.object({
  action: z.enum(["sign", "reject", "terminate", "note"]),
  signer_name: z.string().trim().max(100).optional(),
  signer_title: z.string().trim().max(100).optional(),
  signature: signature.optional(),
  reason: z.string().trim().max(1000).optional(),
  note: z.string().trim().max(1000).optional(),
});

type Params = { params: Promise<{ id: string }> };

/** Trang chi tiết trong bảng quản trị đọc nhật ký ký kết ở đây. */
export async function GET(request: NextRequest, { params }: Params) {
  const limited = enforceRateLimit(request, { name: "admin-contract-detail", limit: 60, windowMs: 60_000 });
  if (limited) return limited;
  const denied = await enforceAdminApiAuth({ minimumRole: "admin" });
  if (denied) return denied;

  const { id } = await params;
  const [row, events] = await Promise.all([getContractById(id), listContractEvents(id)]);
  if (!row) return NextResponse.json({ error: "Không tìm thấy hợp đồng." }, { status: 404 });

  const { access_token: token, ...safe } = row;
  return NextResponse.json({
    item: safe,
    // Dựng lại + đối chiếu băm ở server: trình duyệt không tự băm UTF-8 tiện được.
    rendered: renderStoredContract(row),
    events,
    // Link gửi lại cho đối tác khi họ làm mất email.
    partnerUrl: `${siteConfig.url}/partnership/hop-dong/${row.id}?token=${token}`,
  });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const limited = enforceRateLimit(request, { name: "admin-contract-action", limit: 30, windowMs: 60_000 });
  if (limited) return limited;
  // Ký thay Bên A là hành vi ràng buộc pháp lý — chỉ super_admin.
  const denied = await enforceAdminApiAuth({ minimumRole: "super_admin" });
  if (denied) return denied;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });
  }
  const d = parsed.data;

  const row = await getContractById(id);
  if (!row) return NextResponse.json({ error: "Không tìm thấy hợp đồng." }, { status: 404 });

  const auth = await getAuthContext();
  const actor = auth.email ?? "admin";
  const ip = getClientIp(request);

  let patch: Record<string, unknown> = {};
  let event: "signed_a" | "rejected" | "terminated" | "note" = "note";
  let detail = "";

  if (d.action === "sign") {
    if (row.status !== "pending") {
      return NextResponse.json({ error: `Hợp đồng đang ở trạng thái “${CONTRACT_STATUS_LABEL[row.status]}”, không ký được.` }, { status: 409 });
    }
    if (!d.signature || !d.signer_name) {
      return NextResponse.json({ error: "Cần chữ ký và họ tên người đại diện Bên A." }, { status: 400 });
    }
    patch = {
      status: "signed",
      a_signature: d.signature,
      a_signer_name: d.signer_name,
      a_signer_title: d.signer_title || "Người đại diện",
      a_signer_id: auth.userId,
      a_signed_at: new Date().toISOString(),
      a_sign_ip: ip,
    };
    event = "signed_a";
    detail = `${d.signer_name} — ${d.signer_title || "Người đại diện"}`;
  } else if (d.action === "reject") {
    if (row.status !== "pending") {
      return NextResponse.json({ error: "Chỉ từ chối được hợp đồng đang chờ ký." }, { status: 409 });
    }
    if (!d.reason) return NextResponse.json({ error: "Phải ghi lý do từ chối." }, { status: 400 });
    patch = { status: "rejected", reject_reason: d.reason };
    event = "rejected";
    detail = d.reason;
  } else if (d.action === "terminate") {
    if (row.status !== "signed") {
      return NextResponse.json({ error: "Chỉ chấm dứt được hợp đồng đang có hiệu lực." }, { status: 409 });
    }
    if (!d.reason) return NextResponse.json({ error: "Phải ghi lý do chấm dứt." }, { status: 400 });
    patch = { status: "terminated", reject_reason: d.reason };
    event = "terminated";
    detail = d.reason;
  } else {
    patch = { admin_note: d.note ?? "" };
    event = "note";
    detail = d.note ?? "";
  }

  const { row: updated, error } = await updateContract(id, patch);
  if (error || !updated) {
    return NextResponse.json({ error: "Không cập nhật được hợp đồng." }, { status: 500 });
  }

  await logContractEvent({
    contractId: id,
    event,
    actor,
    detail,
    ip,
    userAgent: request.headers.get("user-agent"),
  });

  await logAdminActivity({
    action: d.action,
    targetType: "partnership_contract",
    targetId: id,
    summary: `Hợp đồng ${row.code}: ${d.action === "sign" ? "Bên A đã ký" : d.action === "reject" ? "từ chối" : d.action === "terminate" ? "chấm dứt" : "ghi chú"}`,
    request,
  }).catch(() => {});

  // Báo cho đối tác — họ không có tài khoản admin để tự vào xem.
  if (d.action !== "note") void notifyPartner(row, d.action, d.reason ?? "");

  return NextResponse.json({ item: updated });
}

async function notifyPartner(
  row: Awaited<ReturnType<typeof getContractById>>,
  action: "sign" | "reject" | "terminate",
  reason: string,
) {
  if (!row?.email) return;

  const url = `${siteConfig.url}/partnership/hop-dong/${row.id}?token=${row.access_token}`;
  const title =
    action === "sign"
      ? `Hợp đồng ${row.code} đã được Arex ký`
      : action === "reject"
        ? `Hợp đồng ${row.code} chưa được chấp nhận`
        : `Hợp đồng ${row.code} đã chấm dứt`;

  const bodyHtml =
    action === "sign"
      ? `Xin chào <strong>${row.full_name}</strong>,<br><br>
         Hợp đồng hợp tác <strong>${row.code}</strong> (gói ${TIER_LABEL[row.tier]}) đã được người đại diện Arex ký và
         <strong>chính thức có hiệu lực</strong> từ ${row.term_start} đến ${row.term_end}.<br><br>
         Bạn xem và lưu bản hợp đồng điện tử đầy đủ (kèm chữ ký hai bên và mã kiểm tra toàn vẹn SHA-256) tại liên kết bên dưới.`
      : action === "reject"
        ? `Xin chào <strong>${row.full_name}</strong>,<br><br>
           Rất tiếc, đề nghị hợp tác <strong>${row.code}</strong> chưa được Arex chấp nhận.<br><br>
           <strong>Lý do:</strong> ${reason}<br><br>
           Bạn có thể điều chỉnh nội dung và gửi lại đề nghị mới bất cứ lúc nào.`
        : `Xin chào <strong>${row.full_name}</strong>,<br><br>
           Hợp đồng <strong>${row.code}</strong> đã chấm dứt theo Điều 10.<br><br>
           <strong>Lý do:</strong> ${reason}<br><br>
           Arex sẽ gỡ logo và các nội dung liên quan khỏi trang công khai trong 05 ngày làm việc.`;

  try {
    const branding = await getEmailBranding();
    await sendMail({
      to: row.email,
      subject: `[Arex] ${title}`,
      html: buildEmailHtml({
        ...branding,
        title,
        bodyHtml,
        cta: { label: "Xem hợp đồng", url },
        footnote:
          "Liên kết này là bản hợp đồng điện tử của riêng bạn — vui lòng không chia sẻ cho người khác. Hợp đồng lưu tại Arex theo Điều 8.4.",
      }),
    });
  } catch {
    // Email hỏng không được làm hỏng thao tác ký — trạng thái đã lưu xong rồi.
  }
}
