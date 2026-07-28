import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter } from "react-router-dom";
import { App } from "@/App";
import { AuthProvider } from "@/auth/auth-context";
import { ToastProvider } from "@/components/toast";
import { ApiError } from "@/lib/api";
import "@/styles.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Mạng di động hay chập chờn → giữ dữ liệu cũ, thử lại vài lần.
      staleTime: 30_000,
      gcTime: 10 * 60_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        // 4xx là lỗi nghiệp vụ, thử lại vô nghĩa.
        if (error instanceof ApiError && error.status < 500) return false;
        return failureCount < 2;
      },
    },
    mutations: { retry: 0 },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <HashRouter>
            <App />
          </HashRouter>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  </StrictMode>,
);
