import { redirect } from "next/navigation";

export default function LegacyTermsRedirectPage() {
  redirect("/terms-of-use");
}
