export type GameKey =
  | "free_fire" | "free_fire_max" | "pubg_mobile" | "lien_quan"
  | "valorant" | "lol" | "wild_rift" | "cod_mobile" | "fifa_online"
  | "genshin" | "minecraft" | "roblox" | "other";

export type GameMeta = {
  key: GameKey;
  label: string;
  short: string;
  hint: string; // placeholder hint
};

export const GAME_LIST: GameMeta[] = [
  { key: "free_fire",     label: "Free Fire",        short: "FF",   hint: "UID 9-10 chữ số" },
  { key: "free_fire_max", label: "Free Fire MAX",    short: "FFM",  hint: "UID 9-10 chữ số" },
  { key: "pubg_mobile",   label: "PUBG Mobile",      short: "PUBG", hint: "ID dài 10-11 số" },
  { key: "lien_quan",     label: "Liên Quân Mobile", short: "LQ",   hint: "ID hoặc nickname" },
  { key: "valorant",      label: "Valorant",         short: "VAL",  hint: "Tên#Tag" },
  { key: "lol",           label: "League of Legends", short: "LOL", hint: "Summoner Name" },
  { key: "wild_rift",     label: "Wild Rift",        short: "WR",   hint: "ID hoặc nickname" },
  { key: "cod_mobile",    label: "Call of Duty Mobile", short: "COD", hint: "UID hoặc nickname" },
  { key: "fifa_online",   label: "FIFA Online",      short: "FO",   hint: "Tên hiển thị" },
  { key: "genshin",       label: "Genshin Impact",   short: "GI",   hint: "UID 9 số" },
  { key: "minecraft",     label: "Minecraft",        short: "MC",   hint: "Username" },
  { key: "roblox",        label: "Roblox",           short: "RBX",  hint: "Username" },
  { key: "other",         label: "Khác",             short: "•",    hint: "Tên game tự nhập" },
];

export const GAME_META_BY_KEY: Record<string, GameMeta> = Object.fromEntries(
  GAME_LIST.map((g) => [g.key, g]),
);
