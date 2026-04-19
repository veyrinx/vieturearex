import { NextResponse } from "next/server";
import { getSettings } from "@/lib/data/content-service";

export async function GET() {
  const settings = await getSettings();
  const get = (key: string) => settings.find((s) => s.key === key)?.value ?? null;
  return NextResponse.json({
    message: get("site.maintenance_message") ?? "Website đang được bảo trì. Vui lòng quay lại sau.",
    endTime: get("site.maintenance_end_time"),
  });
}
