import { Tabs, Redirect } from 'expo-router';
import { useSession } from '../../src/session';
import { Icon, Loading, colors } from '../../src/ui';
export default function TabsLayout() {
  const { user, loading } = useSession();
  if (loading) return <Loading />;
  if (!user) return <Redirect href="/sign-in" />;
  if (!user.onboarded) return <Redirect href="/onboarding" />;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.green,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.paper,
          borderTopColor: colors.line,
          height: 78,
          paddingBottom: 20,
          paddingTop: 10,
        },
        tabBarLabelStyle: { fontFamily: 'Manrope_500Medium', fontSize: 11, lineHeight: 16 },
      }}
    >
      {[
        ['index', 'Home', 'home-outline'],
        ['circles', 'Circles', 'people-outline'],
        ['compose', 'Share', 'add-circle-outline'],
        ['activity', 'Activity', 'heart-outline'],
        ['profile', 'You', 'person-outline'],
      ].map(([name, title, icon]) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{ title, tabBarIcon: ({ color }) => <Icon name={icon as any} color={color} /> }}
        />
      ))}
    </Tabs>
  );
}
