'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ReactNode, useState } from 'react';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AdminAuthProvider } from '@/hooks/use-admin-auth';
import { AdminThemeProvider } from '@/hooks/use-admin-theme';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 2 * 60 * 1000, // 2 minutes for admin
        gcTime: 10 * 60 * 1000,
        refetchOnWindowFocus: Platform.OS !== 'web',
        retry: 1,
        refetchOnReconnect: true,
      },
    },
  });
}

export function AdminProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(makeQueryClient);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AdminThemeProvider>
            <AdminAuthProvider>
              {children}
            </AdminAuthProvider>
          </AdminThemeProvider>
        </QueryClientProvider>
        {__DEV__ && <ReactQueryDevtools initialIsOpen={false} />}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}