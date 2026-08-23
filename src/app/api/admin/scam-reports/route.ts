import { NextRequest, NextResponse } from "next/server";
import { enforceAdminApiAuth } from "@/lib/server/api-guard";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { normalizeSubject, type Severity, type SubjectType } from "@/lib/server/scam-registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUBJECT_TYPES: SubjectType[] = ["uid", "phone", "bank", "contact", "name"];
const SEVERITIES: Severity[] = ["info", "warning", "danger"];

/** GET — danh sách cảnh báo mới nhất (kể cả đã gỡ, để admin thấy dấu vết). */
export async function GET(request: NextRequest) {
  const denied = await enforceAdminApiAuth({ minimumRole: "support" });
  if (denied) return denied;

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ error: "Chưa cấu hình Supabase." }, { status: 500 });

  const params = new URL(request.url).searchParams;
  const q = (params.get("q") ?? "").trim();

  let query = untypedFrom(db, "scam_reports")
    .select("id, subject_type, subject_value, severity, note, source, order_id, dispute_id, seller_id, revoked_at, revoke_reason, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  // Tìm theo giá trị đã chuẩn hoá — admin gõ "0912 345 678" vẫn ra.
  if (q) {
    const normalized = SUBJECT_TYPES.map((t) => normalizeSubject(t, q)).filter(Boolean) as string[];
    query = query.in("subject_value", [...new Set([q, ...normalized])]);
  }

  const { data, error } = (await query) as { data: unknown[] | null; error: { message: string } | null };
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ reports: data ?? [] });
}

/** POST { subject_type, subject_value, severity, note } — admin ghi nhận thủ công. */
export async function POST(request: NextRequest) {
  const denied = await enforceAdminApiAuth({ minimumRole: "admin" });
  if (denied) return denied;

  const body = (await request.json().catch(() => ({}))) as {
    subject_type?: string;
    subject_value?: string;
    severity?: string;
    note?: string;
  };

  const subjectType = body.subject_type as SubjectType;
  if (!SUBJECT_TYPES.includes(subjectType)) {
    return NextResponse.json({ error: "Loại định danh không hợp lệ." }, { status: 400 });
  }

  const value = normalizeSubject(subjectType, body.subject_value ?? "");
  if (!value) {
    return NextResponse.json({ error: "Giá trị không hợp lệ cho loại đã chọn." }, { status: 400 });
  }

  const severity = SEVERITIES.includes(body.severity as Severity)
    ? (body.severity as Severity)
    : "warning";
  const note = (body.note ?? "").trim();
  if (note.length < 10) {
    return NextResponse.json({ error: "Ghi rõ lý do (ít nhất 10 ký tự)." }, { status: 400 });
  }

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ error: "Chưa cấu hình Supabase." }, { status: 500 });

  const supabase = createServerSupabaseClient();
  const { data: auth } = supabase
    ? await supabase.auth.getUser().catch(() => ({ data: { user: null } }))
    : { data: { user: null } };

  const { error } = (await untypedFrom(db, "scam_reports").insert({
    subject_type: subjectType,
    subject_value: value,
    severity,
    note: note.slice(0, 500),
    source: "admin",
    created_by: auth.user?.id ?? null,
  } as never)) as { error: { message: string } | null };

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, subject_value: value });
}

/**
 * PATCH { id, reason } — gỡ một cảnh báo.
 *
 * Gỡ bằng cách đánh dấu `revoked_at` chứ không xoá: cảnh báo sai vẫn phải để
 * lại dấu vết ai gỡ và vì sao, phòng khi tranh cãi về sau.
 */
export async function PATCH(request: NextRequest) {
  const denied = await enforceAdminApiAuth({ minimumRole: "admin" });
  if (denied) return denied;

  const body = (await request.json().catch(() => ({}))) as { id?: string; reason?: string };
  const id = (body.id ?? "").trim();
  const reason = (body.reason ?? "").trim();
  if (!id) return NextResponse.json({ error: "Thiếu id." }, { status: 400 });
  if (reason.length < 5) return NextResponse.json({ error: "Ghi rõ lý do gỡ." }, { status: 400 });

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ error: "Chưa cấu hình Supabase." }, { status: 500 });

  const { error } = (await untypedFrom(db, "scam_reports")
    .update({ revoked_at: new Date().toISOString(), revoke_reason: reason.slice(0, 300) } as never)
    .eq("id", id)) as { error: { message: string } | null };

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
