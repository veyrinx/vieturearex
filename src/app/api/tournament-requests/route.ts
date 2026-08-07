import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import { appendTournamentRequestToLarkSheet } from "@/lib/server/lark-sheet";

const schema = z.object({
  name:             z.string().min(5).max(150),
  format:           z.enum(["solo", "duo", "squad"]),
  estimated_date:   z.string().max(100).optional(),
  max_teams:        z.number().int().min(4).max(64).default(8),
  prize_pool:       z.string().max(200).optional(),
  contact_name:     z.string().min(2).max(100),
  contact_discord:  z.string().max(100).optional(),
  contact_email:    z.string().email(),
  notes:            z.string().max(1000).optional(),
});

export async function POST(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "tournament-request", limit: 3, windowMs: 86_400_000 });
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ.", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const { error } = await untypedFrom(db, "tournament_requests").insert(parsed.data as never);
  if (error) return NextResponse.json({ error: "Không thể gửi yêu cầu." }, { status: 500 });

  // Ghi vào bảng tính Lark (tab "Đăng ký giải") cho đội esports theo dõi.
  void appendTournamentRequestToLarkSheet({
    name:            parsed.data.name,
    format:          parsed.data.format,
    estimated_date:  parsed.data.estimated_date,
    max_teams:       parsed.data.max_teams,
    prize_pool:      parsed.data.prize_pool,
    contact_name:    parsed.data.contact_name,
    contact_discord: parsed.data.contact_discord,
    contact_email:   parsed.data.contact_email,
    notes:           parsed.data.notes,
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
