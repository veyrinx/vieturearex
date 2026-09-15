import { Stack } from 'expo-router';
import { AdminProviders } from '@/components/AdminProviders';
import { AdminStack } from '@/components/layout/AdminStack';

export default function RootLayout() {
  return (
    <AdminProviders>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" options={{ presentation: 'modal' }} />
        <Stack.Screen name="(dashboard)" />
        <Stack.Screen name="+not-found" />
      </Stack>
    </AdminProviders>
  );
}