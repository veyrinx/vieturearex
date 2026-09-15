import { Stack } from 'expo-router';
import { Providers } from '@/components/providers';
import { NativeStack } from '@/components/layout/NativeStack';

export default function RootLayout() {
  return (
    <Providers>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" options={{ presentation: 'modal' }} />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="+not-found" />
      </Stack>
    </Providers>
  );
}