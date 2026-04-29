export type EventServer = {
  key: string;
  label: string;
  short: string;
  flag: string;
  color: string; // tailwind classes for badge
};

export const EVENT_SERVERS: EventServer[] = [
  { key: "vn",     label: "Việt Nam",       short: "VN",     flag: "🇻🇳", color: "bg-red-500/10 text-red-500 border-red-500/30" },
  { key: "global", label: "Global",         short: "GLB",    flag: "🌐", color: "bg-blue-500/10 text-blue-500 border-blue-500/30" },
  { key: "sea",    label: "SEA",            short: "SEA",    flag: "🌏", color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30" },
  { key: "br",     label: "Brazil",         short: "BR",     flag: "🇧🇷", color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30" },
  { key: "in",     label: "Ấn Độ",          short: "IN",     flag: "🇮🇳", color: "bg-orange-500/10 text-orange-500 border-orange-500/30" },
  { key: "id",     label: "Indonesia",      short: "ID",     flag: "🇮🇩", color: "bg-rose-500/10 text-rose-500 border-rose-500/30" },
  { key: "th",     label: "Thái Lan",       short: "TH",     flag: "🇹🇭", color: "bg-violet-500/10 text-violet-500 border-violet-500/30" },
  { key: "ph",     label: "Philippines",    short: "PH",     flag: "🇵🇭", color: "bg-cyan-500/10 text-cyan-500 border-cyan-500/30" },
  { key: "tw",     label: "Đài Loan",       short: "TW",     flag: "🇹🇼", color: "bg-pink-500/10 text-pink-500 border-pink-500/30" },
  { key: "mena",   label: "Trung Đông",     short: "MENA",   flag: "🌍", color: "bg-amber-500/10 text-amber-500 border-amber-500/30" },
  { key: "latam",  label: "Mỹ Latin",       short: "LATAM",  flag: "🌎", color: "bg-teal-500/10 text-teal-500 border-teal-500/30" },
];

export const EVENT_SERVER_BY_KEY: Record<string, EventServer> = Object.fromEntries(
  EVENT_SERVERS.map((s) => [s.key, s]),
);

export function getEventServer(key: string | null | undefined): EventServer | null {
  if (!key) return null;
  return EVENT_SERVER_BY_KEY[key.toLowerCase()] ?? null;
}
