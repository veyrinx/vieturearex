import { NextResponse } from "next/server";
import { getSettings } from "@/lib/data/content-service";

export async function GET() {
  try {
    const settings = await getSettings();
    const settingsMap = settings.reduce<Record<string, string>>((acc, s) => {
      acc[s.key] = s.value;
      return acc;
    }, {});

    return NextResponse.json({
      message: settingsMap["site.maintenance_message"] || "Website đang được nâng cấp. Chúng tôi sẽ sớm trở lại với những tính năng mới!",
      endTime: settingsMap["site.maintenance_end_time"] || null,
    });
  } catch (error) {
    return NextResponse.json(
      { message: "Website đang được nâng cấp. Chúng tôi sẽ sớm trở lại với những tính năng mới!", endTime: null },
      { status: 200 }
    );
  }
}
