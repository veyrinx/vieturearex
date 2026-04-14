import { create } from "zustand";
import type { EventItem, EventStatus } from "@/lib/types/content";

type EventUiState = {
  search: string;
  status: EventStatus | "all";
  selectedEvent: EventItem | null;
  setSearch: (value: string) => void;
  setStatus: (value: EventStatus | "all") => void;
  setSelectedEvent: (event: EventItem | null) => void;
  reset: () => void;
};

const initialState = {
  search: "",
  status: "all" as const,
  selectedEvent: null,
};

export const useEventUiStore = create<EventUiState>((set) => ({
  ...initialState,
  setSearch: (search) => set({ search }),
  setStatus: (status) => set({ status }),
  setSelectedEvent: (selectedEvent) => set({ selectedEvent }),
  reset: () => set(initialState),
}));
