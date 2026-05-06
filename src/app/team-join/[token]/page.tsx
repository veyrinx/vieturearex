import { TeamJoinForm } from "@/components/team/team-join-form";
import { getSettings } from "@/lib/data/content-service";
import { buildSettingsMap, resolveTeamJoinSettings } from "@/lib/utils/site-settings";

export const revalidate = 60;

export default async function TeamJoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const settings = await getSettings();
  const config = resolveTeamJoinSettings(buildSettingsMap(settings));
  return <TeamJoinForm token={token} config={config} />;
}
