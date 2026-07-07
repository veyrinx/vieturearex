import React from "react";
import { App, ZMPRouter, AnimationRoutes, SnackbarProvider, Route } from "zmp-ui";
import { AuthProvider } from "./hooks/useAuth";
import { NavBar } from "./components/navbar";
import HomePage from "./pages/home";
import NewsPage from "./pages/news";
import EventsPage from "./pages/events";
import EventDetailPage from "./pages/event-detail";
import TournamentsPage from "./pages/tournaments";
import LeaderboardPage from "./pages/leaderboard";
import ForumPage from "./pages/forum";
import ForumPostPage from "./pages/forum-post";
import LoginPage from "./pages/login";
import AccountPage from "./pages/account";
import EditProfilePage from "./pages/edit-profile";
import NotificationsPage from "./pages/notifications";

export default function MyApp() {
  return (
    <App>
      <SnackbarProvider>
        <AuthProvider>
          <ZMPRouter>
            <AnimationRoutes>
              <Route path="/" element={<HomePage />} />
              <Route path="/news" element={<NewsPage />} />
              <Route path="/events" element={<EventsPage />} />
              <Route path="/events/:id" element={<EventDetailPage />} />
              <Route path="/tournaments" element={<TournamentsPage />} />
              <Route path="/leaderboard" element={<LeaderboardPage />} />
              <Route path="/forum" element={<ForumPage />} />
              <Route path="/forum/:id" element={<ForumPostPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/account" element={<AccountPage />} />
              <Route path="/edit-profile" element={<EditProfilePage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
            </AnimationRoutes>
            <NavBar />
          </ZMPRouter>
        </AuthProvider>
      </SnackbarProvider>
    </App>
  );
}
