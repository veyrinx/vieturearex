import React from "react";
import { App, ZMPRouter, AnimationRoutes, SnackbarProvider, Route } from "zmp-ui";
import { NavBar } from "./components/navbar";
import HomePage from "./pages/home";
import NewsPage from "./pages/news";
import EventsPage from "./pages/events";
import TournamentsPage from "./pages/tournaments";
import LeaderboardPage from "./pages/leaderboard";

export default function MyApp() {
  return (
    <App>
      <SnackbarProvider>
        <ZMPRouter>
          <AnimationRoutes>
            <Route path="/" element={<HomePage />} />
            <Route path="/news" element={<NewsPage />} />
            <Route path="/events" element={<EventsPage />} />
            <Route path="/tournaments" element={<TournamentsPage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
          </AnimationRoutes>
          <NavBar />
        </ZMPRouter>
      </SnackbarProvider>
    </App>
  );
}
