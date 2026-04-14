import { redirect } from "next/navigation";

type LegacyNewsDetailRedirectPageProps = {
  params: {
    slug: string;
  };
};

export default function LegacyNewsDetailRedirectPage({ params }: LegacyNewsDetailRedirectPageProps) {
  redirect(`/news/${params.slug}`);
}
