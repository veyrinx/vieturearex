"use client";

import { useEffect } from "react";

const SESSION_KEY = "arex_checkin_done";

// Calls /api/user/checkin once per browser session (not per render).
// Silent — no loading state needed. Safe to call from any layout/component.
export function useDailyCheckin() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(SESSION_KEY)) return;

    sessionStorage.setItem(SESSION_KEY, "1");
    fetch("/api/user/checkin", { method: "POST", credentials: "same-origin" }).catch(() => {});
  }, []);
}
