import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { Stack, router } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
} from '@expo-google-fonts/manrope';
import { SessionProvider, useSession } from '../src/session';
import { Loading, colors } from '../src/ui';
const query = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 15000 }, mutations: { retry: false } },
});
function NotificationNavigation() {
  const { user } = useSession();
  useEffect(() => {
    if (Platform.OS === 'web' || !user) return;
    const navigate = (response: Notifications.NotificationResponse) => {
      if (response.notification.request.content.data?.screen === 'activity') {
        router.push('/activity');
        void Notifications.clearLastNotificationResponseAsync();
      }
    };
    const subscription = Notifications.addNotificationResponseReceivedListener(navigate);
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) navigate(response);
    });
    return () => subscription.remove();
  }, [user?.id]);
  return null;
}
export default function Layout() {
  const [loaded, error] = useFonts({ Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold });
  if (!loaded && !error) return <Loading />;
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={query}>
        <SessionProvider>
          <NotificationNavigation />
          <Stack
            screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}
          />
        </SessionProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
