import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Tabs, Redirect } from 'expo-router';
import { useSession } from '../../src/session';
import { Icon, Loading, colors } from '../../src/ui';
export default function TabsLayout() {
  const { user, loading } = useSession();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const wide = width >= 900;
  if (loading) return <Loading />;
  if (!user) return <Redirect href="/sign-in" />;
  if (!user.onboarded) return <Redirect href="/onboarding" />;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarPosition: wide ? 'left' : 'bottom',
        tabBarLabelPosition: wide ? 'beside-icon' : 'below-icon',
        tabBarItemStyle: wide
          ? { height: 56, marginVertical: 4, borderRadius: 12 }
          : { paddingVertical: 0 },
        tabBarActiveBackgroundColor: wide ? colors.soft : undefined,
        tabBarActiveTintColor: colors.green,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.paper,
          borderTopColor: colors.line,
          height: wide ? undefined : 72 + insets.bottom,
          width: wide ? 184 : undefined,
          paddingBottom: wide ? 16 : Math.max(8, insets.bottom),
          paddingTop: wide ? 36 : 4,
          paddingHorizontal: wide ? 12 : 4,
          borderTopWidth: wide ? 0 : 1,
          borderRightColor: colors.line,
        },
        tabBarLabelStyle: {
          fontFamily: 'Manrope_500Medium',
          fontSize: wide ? 14 : 11,
          lineHeight: wide ? 20 : 16,
          minHeight: wide ? 20 : 16,
          flexShrink: 0,
        },
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
          options={{
            title,
            tabBarIcon: ({ color, focused }) => (
              <Icon
                name={(focused ? icon?.replace('-outline', '') : icon) as any}
                color={color}
                size={22}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
