import { redirect } from "next/navigation";

export default function LegacyCalendarRedirectPage() {
  redirect("/calendar");
}
