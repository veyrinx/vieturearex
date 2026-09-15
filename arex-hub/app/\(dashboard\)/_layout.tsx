import { Stack } from 'expo-router';

export default function DashboardLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="analytics" />
      <Stack.Screen name="realtime" />
      <Stack.Screen name="news" />
      <Stack.Screen name="events" />
      <Stack.Screen name="community" />
      <Stack.Screen name="users" />
      <Stack.Screen name="ff" />
      <Stack.Screen name="tournaments" />
      <Stack.Screen name="prime" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="admins" />
      <Stack.Screen name="logs" />
      <Stack.Screen name="backup" />
      <Stack.Screen name="moderation" />
    </Stack>
  );
}