import { redirect } from "next/navigation";

export default function LegacyNewsRedirectPage() {
  redirect("/news");
}
