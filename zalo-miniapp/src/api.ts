import { API_BASE } from "./config";
import type { EventItem, NewsItem, TournamentItem, PlayerRank } from "./types";

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

// Danh sách tin tức (bỏ body nặng bằng content=0).
export async function fetchNews(): Promise<NewsItem[]> {
  const data = await getJson<{ news: NewsItem[] }>("/api/news?content=0");
  return data.news ?? [];
}

// Danh sách sự kiện (tất cả trạng thái, hiển thị active + upcoming trước).
export async function fetchEvents(): Promise<EventItem[]> {
  const data = await getJson<{ events: EventItem[] }>("/api/events?status=all");
  return data.events ?? [];
}

// Danh sách giải đấu (TMS trả về mảng trực tiếp).
export async function fetchTournaments(): Promise<TournamentItem[]> {
  const data = await getJson<TournamentItem[]>("/api/tms/tournaments");
  return Array.isArray(data) ? data : [];
}

// Bảng xếp hạng tuyển thủ (top 20 theo điểm).
export async function fetchLeaderboard(): Promise<PlayerRank[]> {
  const data = await getJson<{ players: PlayerRank[] }>("/api/leaderboard");
  return data.players ?? [];
}
