import { redirect } from "next/navigation";

export default function LegacyEventsRedirectPage() {
  redirect("/events");
}
