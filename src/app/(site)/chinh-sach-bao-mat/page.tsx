import { redirect } from "next/navigation";

export default function LegacyPrivacyPolicyRedirectPage() {
  redirect("/privacy-policy");
}
